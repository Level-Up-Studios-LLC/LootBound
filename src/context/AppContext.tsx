import React, {
  useState,
  useEffect,
  createContext,
  useContext,
} from 'react';
import * as Sentry from '@sentry/react';
import type {
  Config,
  TierConfig,
  UserData,
  Child,
  Reward,
  AddChildFormData,
  Notification,
} from '../types.ts';
import { DEF_TIER_CONFIG } from '../constants.ts';
import {
  freshUser,
  getToday,
  getWeekStart,
  isPastBedtime,
  isTaskActiveToday,
} from '../utils.ts';
import {
  getConfig as fsGetConfig,
  saveConfig as fsSaveConfig,
  getChildren as fsGetChildren,
  saveChild as fsSaveChild,
  deleteChild as fsDeleteChild,
  getTasks as fsGetTasks,
  saveTask as fsSaveTask,
  deleteTask as fsDeleteTask,
  getRewards as fsGetRewards,
  saveReward as fsSaveReward,
  deleteReward as fsDeleteReward,
  getChildData as fsGetChildData,
  saveChildData as fsSaveChildData,
} from '../services/firestoreStorage.ts';
import { deleteAllChildPhotos } from '../services/photoStorage.ts';
import { useNotification } from '../hooks/useNotification.ts';
import { useTaskActions } from '../hooks/useTaskActions.ts';
import { useRewardActions } from '../hooks/useRewardActions.ts';
import { useApprovalActions } from '../hooks/useApprovalActions.ts';
import { useChildActions } from '../hooks/useChildActions.ts';
import { useFirestoreSync } from '../hooks/useFirestoreSync.ts';

interface AppContextValue {
  familyId: string;
  cfg: Config | null;
  allU: Record<string, UserData>;
  curUser: string | null;
  screen: string;
  loading: boolean;
  bedLock: boolean;
  notif: Notification | null;
  viewPhoto: string | null;
  fileRef: React.RefObject<HTMLInputElement | null>;

  children: Child[];
  currentChild: Child | null;
  currentUserData: UserData | null;
  todayTasks: import('../types.ts').Task[];
  tLog: Record<string, any>;
  pendingCount: number;

  setScreen: (s: string) => void;
  setCurUser: (u: string | null) => void;
  setViewPhoto: (p: string | null) => void;
  notify: (msg: string, type?: string) => void;
  tp: (tier: string) => number;
  tierCfg: (tier: string) => TierConfig;

  saveCfg: (c: Config) => Promise<void>;
  saveUsr: (uid: string, data: UserData) => Promise<void>;
  startCapture: (taskId: string) => void;
  handlePhoto: (e: React.ChangeEvent<HTMLInputElement>) => void;
  doComplete: (taskId: string, photo: string | null) => Promise<void>;
  rejectTask: (uid: string, taskId: string) => Promise<void>;
  canRedeem: (
    uid: string,
    reward: Reward
  ) => { ok: boolean; reason: string | null };
  needsApproval: (reward: Reward) => boolean;
  requestRedemption: (reward: Reward) => Promise<void>;
  execRedeem: (uid: string, reward: Reward) => Promise<void>;
  approvePending: (uid: string, idx: number) => Promise<void>;
  denyPending: (uid: string, idx: number) => Promise<void>;
  addBonus: (uid: string, pts: number) => Promise<void>;
  resetAll: () => Promise<void>;
  doAddChild: (form: AddChildFormData) => Promise<void>;
  doRemoveChild: (id: string) => Promise<void>;
  getChild: (id: string) => Child | null;
  onLogout: (() => void) | null;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppProvider');
  return ctx;
}

export function AppProvider(props: {
  children: React.ReactNode;
  familyId: string;
  initialScreen?: string;
  initialUser?: string | null;
  onLogout?: () => void;
}) {
  const [screen, setScreen] = useState(props.initialScreen || 'login');
  const [curUser, setCurUserRaw] = useState<string | null>(props.initialUser || null);

  const setCurUser = (uid: string | null) => {
    setCurUserRaw(uid);
    try {
      if (uid && uid !== 'parent') {
        sessionStorage.setItem('qb-kid-session', JSON.stringify({ val: uid, ts: Date.now() }));
      } else if (!uid) {
        sessionStorage.removeItem('qb-kid-session');
        if (props.onLogout) props.onLogout();
      }
    } catch (_e) { /* ignore */ }
  };
  const [cfg, setCfg] = useState<Config | null>(null);
  const [allU, setAllU] = useState<Record<string, UserData>>({});
  const [loading, setLoading] = useState(true);
  const [_tick, setTick] = useState(0);
  void _tick;
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);
  const familyId = props.familyId;

  // --- Notification hook ---
  const notification = useNotification();

  // --- Helper functions ---
  const getChild = (id: string): Child | null => {
    if (!cfg || !cfg.children) return null;
    return (
      cfg.children.find((c) => c.id === id) || null
    );
  };

  const tierCfg = (tier: string): TierConfig => {
    const tc = cfg && cfg.tierConfig ? cfg.tierConfig[tier] : null;
    if (tc) return tc;
    const def = DEF_TIER_CONFIG[tier];
    return def || { coins: 0, xp: 0 };
  };

  const tp = (tier: string): number => {
    return tierCfg(tier).coins;
  };

  // --- Persistence ---
  const saveUsr = async (uid: string, data: UserData) => {
    setAllU((p) => {
      const o: Record<string, UserData> = {};
      for (const k in p) o[k] = p[k];
      o[uid] = data;
      return o;
    });
    await fsSaveChildData(familyId, uid, data);
  };

  const saveCfg = async (newCfg: Config) => {
    const oldCfg = cfg;
    setCfg(newCfg);
    await syncCfgToFirestore(oldCfg, newCfg);
  };

  const syncCfgToFirestore = async (
    oldCfg: Config | null,
    newCfg: Config
  ) => {
    const promises: Promise<void>[] = [];

    const cfgFields: Record<string, any> = {
      tierConfig: newCfg.tierConfig,
      approvalThreshold: newCfg.approvalThreshold,
      lastWeeklyReset: newCfg.lastWeeklyReset,
    };
    if (newCfg.bedtime != null) cfgFields.bedtime = newCfg.bedtime;
    if (newCfg.weeklyResetDay != null)
      cfgFields.weeklyResetDay = newCfg.weeklyResetDay;
    if (newCfg.cooldown != null) cfgFields.cooldown = newCfg.cooldown;
    promises.push(fsSaveConfig(familyId, cfgFields));

    (newCfg.children || []).forEach((ch) => {
      promises.push(fsSaveChild(familyId, ch.id, ch));
    });
    if (oldCfg) {
      const newChildIds: Record<string, boolean> = {};
      (newCfg.children || []).forEach((ch) => {
        newChildIds[ch.id] = true;
      });
      (oldCfg.children || []).forEach((ch) => {
        if (!newChildIds[ch.id])
          promises.push(fsDeleteChild(familyId, ch.id));
      });
    }

    const newTaskIds: Record<string, boolean> = {};
    Object.keys(newCfg.tasks || {}).forEach((cid) => {
      (newCfg.tasks[cid] || []).forEach((t) => {
        newTaskIds[t.id] = true;
        promises.push(
          fsSaveTask(familyId, t.id, { childId: cid, ...t })
        );
      });
    });
    if (oldCfg) {
      Object.keys(oldCfg.tasks || {}).forEach((cid) => {
        (oldCfg!.tasks[cid] || []).forEach((t) => {
          if (!newTaskIds[t.id])
            promises.push(fsDeleteTask(familyId, t.id));
        });
      });
    }

    const newRewardIds: Record<string, boolean> = {};
    (newCfg.rewards || []).forEach((r) => {
      newRewardIds[r.id] = true;
      promises.push(fsSaveReward(familyId, r.id, r));
    });
    if (oldCfg) {
      (oldCfg.rewards || []).forEach((r) => {
        if (!newRewardIds[r.id])
          promises.push(fsDeleteReward(familyId, r.id));
      });
    }

    await Promise.all(promises);
  };

  // --- Compose action hooks ---
  const taskActions = useTaskActions({
    cfg,
    allU,
    curUser,
    familyId,
    saveUsr,
    notify: notification.notify,
    tp,
    tierCfg,
  });

  const rewardActions = useRewardActions({
    cfg,
    allU,
    curUser,
    saveUsr,
    notify: notification.notify,
  });

  const approvalActions = useApprovalActions({
    allU,
    saveUsr,
    notify: notification.notify,
  });

  const childActions = useChildActions({
    cfg,
    allU,
    familyId,
    saveCfg,
    saveUsr,
    setAllU,
    notify: notification.notify,
    getChild,
  });

  // --- Initial data load from Firestore ---
  useEffect(() => {
    if (!familyId) return;
    let dead = false;
    (async () => {
      try {
      let fc = await fsGetConfig(familyId);
      const fsChildren = await fsGetChildren(familyId);
      const fsTasks = await fsGetTasks(familyId);
      const fsRewards = await fsGetRewards(familyId);

      const needsSeed = !fc && fsChildren.length === 0;
      if (needsSeed) {
        // Re-read config in case CreatePinPrompt wrote parentPin
        // between our initial read and now
        const freshCfg = await fsGetConfig(familyId);
        const defConfig = {
          parentPin: '',
          tierConfig: structuredClone(DEF_TIER_CONFIG),
          approvalThreshold: 300,
          lastWeeklyReset: getWeekStart(),
        };
        // merge: true in fsSaveConfig preserves any existing parentPin
        await fsSaveConfig(familyId, defConfig);
        fc = freshCfg ? { ...defConfig, ...freshCfg } : defConfig;
      } else if (fc) {
        // Config doc exists (e.g. parentPin was saved during signup)
        // but may be missing seed defaults — fill them in without
        // overwriting fields that already have values.
        const patches: Record<string, any> = {};
        if (!(fc as any).tierConfig && !(fc as any).tierPoints) {
          patches.tierConfig = structuredClone(DEF_TIER_CONFIG);
        }
        if (fc.approvalThreshold == null) {
          patches.approvalThreshold = 300;
        }
        if (!fc.lastWeeklyReset) {
          patches.lastWeeklyReset = getWeekStart();
        }
        if (Object.keys(patches).length > 0) {
          await fsSaveConfig(familyId, patches);
          fc = { ...fc, ...patches };
        }
      }

      // Migration: tierPoints (numeric) -> tierConfig (letter-based)
      if (fc && !(fc as any).tierConfig && (fc as any).tierPoints) {
        const oldTp = (fc as any).tierPoints;
        const numToLetter: Record<string, string> = { '1': 'D', '2': 'C', '3': 'B', '4': 'A' };
        const migrated: Record<string, { coins: number; xp: number }> = structuredClone(DEF_TIER_CONFIG);
        Object.keys(oldTp).forEach((k) => {
          const letter = numToLetter[k];
          if (letter && migrated[letter]) {
            migrated[letter].coins = oldTp[k];
          }
        });
        // Migrate task tiers from numeric to letter first
        const taskMigrations: Promise<void>[] = [];
        fsTasks.forEach((t: any) => {
          const letter = numToLetter[String(t.tier)];
          if (letter) {
            t.tier = letter;
            taskMigrations.push(fsSaveTask(familyId, t.id, { tier: letter } as any));
          }
        });
        let migrationOk = true;
        if (taskMigrations.length > 0) {
          try {
            await Promise.all(taskMigrations);
          } catch (err) {
            console.error('Task tier migration failed, will retry on next load:', err);
            Sentry.captureException(err, { tags: { action: 'tier-migration' } });
            migrationOk = false;
          }
        }
        // Save config only after all tasks are migrated successfully
        if (migrationOk) {
          (fc as any).tierConfig = migrated;
          await fsSaveConfig(familyId, { tierConfig: migrated } as any);
        }
      }

      if (fc && !(fc as any).familyCode) {
        const genCode = await import('../services/familyCode.ts');
        const code = await genCode.generateFamilyCode();
        await genCode.registerFamilyCode(code, familyId);
        (fc as any).familyCode = code;
        // Persist family code on the config doc so deleteFamily can find it
        await fsSaveConfig(familyId, { familyCode: code } as any);
      }

      const tasksMap: Record<string, import('../types.ts').Task[]> = {};
      fsTasks.forEach((t: any) => {
        const cid = t.childId || '';
        if (!tasksMap[cid]) tasksMap[cid] = [];
        tasksMap[cid].push({
          id: t.id,
          name: t.name,
          tier: t.tier,
          windowStart: t.windowStart,
          windowEnd: t.windowEnd,
          daily: t.daily,
          dueDay: t.dueDay,
        });
      });

      const c: Config = {
        children: fsChildren as Child[],
        tasks: tasksMap,
        rewards: fsRewards as Reward[],
        parentPin: fc && fc.parentPin ? fc.parentPin : '',
        tierConfig:
          fc && fc.tierConfig
            ? fc.tierConfig
            : structuredClone(DEF_TIER_CONFIG),
        approvalThreshold:
          fc != null && fc.approvalThreshold != null
            ? fc.approvalThreshold
            : 300,
        lastWeeklyReset: fc ? fc.lastWeeklyReset || '' : '',
        familyCode: fc ? fc.familyCode || '' : '',
        bedtime: fc && fc.bedtime != null ? fc.bedtime : undefined,
        weeklyResetDay:
          fc && fc.weeklyResetDay != null ? fc.weeklyResetDay : undefined,
        cooldown: fc && fc.cooldown != null ? fc.cooldown : undefined,
        parentName: fc && fc.parentName ? fc.parentName : undefined,
        referralSource: fc && fc.referralSource ? fc.referralSource : undefined,
      };
      if (!c.children) c.children = [];
      if (!c.tierConfig) c.tierConfig = structuredClone(DEF_TIER_CONFIG);

      const users: Record<string, UserData> = {};
      const ws = getWeekStart(c.weeklyResetDay);
      const needsReset = c.lastWeeklyReset < ws;
      for (let i = 0; i < c.children.length; i++) {
        const ch = c.children[i];
        let ud =
          (await fsGetChildData(familyId, ch.id)) as UserData | null;
        if (!ud) ud = freshUser();
        // Migration: add xp/level fields if missing
        if (ud.xp == null) ud.xp = 0;
        if (ud.level == null) ud.level = 1;
        if (ud.missedDaysThisWeek == null) ud.missedDaysThisWeek = 0;
        if (needsReset) {
          ud.missedDaysThisWeek = 0;
          // Delete photos from Storage before clearing the log
          ((childId: string) => {
            deleteAllChildPhotos(familyId, childId).catch((err) => {
              console.warn(`Photo cleanup failed for ${childId}:`, err);
              Sentry.captureException(err, { tags: { action: 'weekly-reset-photo-cleanup', childId } });
            });
          })(ch.id);
          ud.taskLog = {};
          await fsSaveChildData(familyId, ch.id, ud);
        }
        users[ch.id] = ud;
      }
      if (needsReset) {
        c.lastWeeklyReset = ws;
        await fsSaveConfig(familyId, { lastWeeklyReset: ws });
      }
      if (!dead) {
        setCfg(c);
        setAllU(users);
        setLoading(false);
      }
      } catch (err) {
        console.error('Initial data load failed:', err);
        Sentry.captureException(err, { tags: { action: 'initial-load' } });
        if (!dead) setLoading(false);
      }
    })();
    return () => {
      dead = true;
    };
  }, [familyId]);

  // --- Real-time Firestore sync ---
  useFirestoreSync({
    familyId,
    loading,
    setCfg,
    setAllU,
  });

  // 30-second tick for bedtime cutoff detection (time-based, not data-based)
  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
    }, 30000);
    return () => {
      clearInterval(id);
    };
  }, []);

  // Bedtime cutoff
  useEffect(() => {
    if (!cfg || loading) return;
    (async () => {
      for (let i = 0; i < cfg.children.length; i++) {
        const ch = cfg.children[i];
        const ud = allU[ch.id];
        if (!ud) continue;
        if (!isPastBedtime(cfg.bedtime)) continue;
        const d = getToday();
        const log = ud.taskLog && ud.taskLog[d] ? ud.taskLog[d] : {};
        if (log._bedtimeApplied) continue;
        const updated = structuredClone(ud) as UserData;
        if (!updated.taskLog) updated.taskLog = {};
        if (!updated.taskLog[d]) updated.taskLog[d] = {};
        const tasks = (cfg.tasks[ch.id] || []).filter(isTaskActiveToday);
        let changed = false;
        tasks.forEach((t) => {
          const entry = updated.taskLog[d][t.id];
          if (!entry || entry.rejected) {
            const tc = tierCfg(t.tier);
            updated.taskLog[d][t.id] = {
              completedAt: null,
              status: 'missed',
              points: -tc.coins,
              xp: 0,
              photo: null,
              rejected: false,
              autoCutoff: true,
            };
            updated.points = (updated.points || 0) - tc.coins;
            changed = true;
          }
        });
        if (changed) {
          updated.taskLog[d]._bedtimeApplied = true;
          // Grace day: allow 1 missed day per week
          updated.missedDaysThisWeek = (updated.missedDaysThisWeek || 0) + 1;
          if (updated.missedDaysThisWeek > 1) {
            updated.streak = 0;
          }
          await saveUsr(ch.id, updated);
        }
      }
    })();
  });

  // Validate restored kid session — promote to dashboard if valid, reset if not
  useEffect(() => {
    if (!loading && cfg && curUser && curUser !== 'parent') {
      const found = cfg.children.some((c) => c.id === curUser);
      if (found) {
        // Valid restored session — go to dashboard
        if (screen === 'login') setScreen('dashboard');
      } else {
        // Invalid child ID — reset
        setCurUser(null);
        setScreen('login');
      }
    }
  }, [loading, cfg, curUser]);

  // --- Derived values ---
  const children = cfg ? cfg.children : [];
  const currentChild =
    curUser && curUser !== 'parent' ? getChild(curUser) : null;
  const currentUserData =
    curUser && curUser !== 'parent' ? allU[curUser] || null : null;
  const uTasks =
    curUser && curUser !== 'parent' && cfg ? cfg.tasks[curUser] || [] : [];
  const todayTasks = uTasks.filter(isTaskActiveToday);
  const d = getToday();
  const tLog =
    currentUserData && currentUserData.taskLog && currentUserData.taskLog[d]
      ? currentUserData.taskLog[d]
      : {};
  const bedLock = isPastBedtime(cfg ? cfg.bedtime : undefined);
  let pendingCount = 0;
  children.forEach((c) => {
    const u = allU[c.id];
    if (u && u.pendingRedemptions) pendingCount += u.pendingRedemptions.length;
  });

  const value: AppContextValue = {
    familyId,
    cfg,
    allU,
    curUser,
    screen,
    loading,
    bedLock,
    notif: notification.notif,
    viewPhoto,
    fileRef: taskActions.fileRef,
    children,
    currentChild,
    currentUserData,
    todayTasks,
    tLog,
    pendingCount,
    setScreen,
    setCurUser,
    setViewPhoto,
    notify: notification.notify,
    tp,
    tierCfg,
    saveCfg,
    saveUsr,
    startCapture: taskActions.startCapture,
    handlePhoto: taskActions.handlePhoto,
    doComplete: taskActions.doComplete,
    rejectTask: taskActions.rejectTask,
    canRedeem: rewardActions.canRedeem,
    needsApproval: rewardActions.needsApproval,
    requestRedemption: rewardActions.requestRedemption,
    execRedeem: rewardActions.execRedeem,
    approvePending: approvalActions.approvePending,
    denyPending: approvalActions.denyPending,
    addBonus: childActions.addBonus,
    resetAll: childActions.resetAll,
    doAddChild: childActions.doAddChild,
    doRemoveChild: childActions.doRemoveChild,
    getChild,
    onLogout: props.onLogout || null,
  };

  return (
    <AppContext.Provider value={value}>{props.children}</AppContext.Provider>
  );
}
