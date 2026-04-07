import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
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
  CoopRequest,
} from '../types.ts';
import {
  DEF_TIER_CONFIG,
  DEF_NOTIFICATION_PREFS,
  MIN_COINS,
} from '../constants.ts';
import { setStorage, removeStorage } from '../services/platform.ts';
import {
  freshUser,
  getToday,
  getWeekStart,
  isPastBedtime,
  isTaskActiveToday,
  isTaskActiveTomorrow,
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
import { useCoopActions } from '../hooks/useCoopActions.ts';
import { useFirestoreSync } from '../hooks/useFirestoreSync.ts';
import { useNavigation } from '../hooks/useNavigation.ts';
import { useNotificationListener } from '../hooks/useNotificationListener.ts';
import {
  unlockAudio,
  preloadSounds,
  playSound,
} from '../services/notificationSound.ts';
import type { SoundKey } from '../services/notificationSound.ts';
import {
  cleanupOldNotifications,
  cleanupOldCoopRequests,
  writeNotification,
  saveCoopRequest,
} from '../services/firestoreStorage.ts';
import {
  generateFamilyCode,
  registerFamilyCode,
} from '../services/familyCode.ts';

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
  activeTasks: import('../types.ts').Task[];
  tomorrowTasks: import('../types.ts').Task[];
  tLog: Record<string, any>;
  pendingCount: number;

  setScreen: (s: string) => void;
  navigate: (target: string, direction?: 'forward' | 'back') => void;
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
  addBonus: (uid: string, pts: number, reason?: string) => Promise<void>;
  resetAll: () => Promise<void>;
  resetData: (opts: import('../types.ts').ResetOptions) => Promise<void>;
  doAddChild: (form: AddChildFormData) => Promise<void>;
  doRemoveChild: (id: string) => Promise<void>;
  getChild: (id: string) => Child | null;
  onLogout: (() => void) | null;

  // Co-op
  coopRequests: CoopRequest[];
  requestCoop: (
    initiatorId: string,
    taskId: string,
    partnerId: string
  ) => Promise<void>;
  acceptCoop: (requestId: string) => Promise<void>;
  declineCoop: (requestId: string) => Promise<void>;
  approveCoop: (
    requestId: string,
    overrides?: {
      windowStart?: string;
      windowEnd?: string;
      coinOverride?: number;
    }
  ) => Promise<void>;
  denyCoop: (requestId: string) => Promise<void>;
  cancelCoop: (requestId: string) => Promise<void>;
  isTaskInActiveCoop: (
    childId: string,
    taskId: string,
    date: string
  ) => boolean;
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
  const navigateRaw = useNavigation(setScreen);
  const navigate = useCallback(
    (target: string, direction?: 'forward' | 'back') =>
      navigateRaw(target, direction, screen),
    [navigateRaw, screen]
  );
  const [curUser, setCurUserRaw] = useState<string | null>(
    props.initialUser || null
  );

  const setCurUser = (uid: string | null) => {
    setCurUserRaw(uid);
    if (uid && uid !== 'parent') {
      setStorage(
        'qb-kid-session',
        JSON.stringify({ val: uid, ts: Date.now() })
      );
    } else if (!uid) {
      removeStorage('qb-kid-session');
      if (props.onLogout) props.onLogout();
    }
  };
  const [cfg, setCfg] = useState<Config | null>(null);
  const [allU, setAllU] = useState<Record<string, UserData>>({});
  const [coopRequests, setCoopRequests] = useState<CoopRequest[]>([]);
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
    return cfg.children.find(c => c.id === id) || null;
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
    setAllU(p => {
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

  const syncCfgToFirestore = async (oldCfg: Config | null, newCfg: Config) => {
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
    if (newCfg.notificationPrefs)
      cfgFields.notificationPrefs = newCfg.notificationPrefs;
    promises.push(fsSaveConfig(familyId, cfgFields));

    (newCfg.children || []).forEach(ch => {
      promises.push(fsSaveChild(familyId, ch.id, ch));
    });
    if (oldCfg) {
      const newChildIds: Record<string, boolean> = {};
      (newCfg.children || []).forEach(ch => {
        newChildIds[ch.id] = true;
      });
      (oldCfg.children || []).forEach(ch => {
        if (!newChildIds[ch.id]) promises.push(fsDeleteChild(familyId, ch.id));
      });
    }

    const newTaskIds: Record<string, boolean> = {};
    Object.keys(newCfg.tasks || {}).forEach(cid => {
      (newCfg.tasks[cid] || []).forEach(t => {
        newTaskIds[t.id] = true;
        promises.push(fsSaveTask(familyId, t.id, { childId: cid, ...t }));
      });
    });
    if (oldCfg) {
      Object.keys(oldCfg.tasks || {}).forEach(cid => {
        (oldCfg!.tasks[cid] || []).forEach(t => {
          if (!newTaskIds[t.id]) promises.push(fsDeleteTask(familyId, t.id));
        });
      });
    }

    const newRewardIds: Record<string, boolean> = {};
    (newCfg.rewards || []).forEach(r => {
      newRewardIds[r.id] = true;
      promises.push(fsSaveReward(familyId, r.id, r));
    });
    if (oldCfg) {
      (oldCfg.rewards || []).forEach(r => {
        if (!newRewardIds[r.id]) promises.push(fsDeleteReward(familyId, r.id));
      });
    }

    await Promise.all(promises);
  };

  // --- Helper to get child name by ID ---
  const getChildName = (id: string): string => {
    const ch = getChild(id);
    return ch ? ch.name : id;
  };

  // --- Pref-aware sound helper ---
  const playSoundIfAllowed = (key: SoundKey): void => {
    const prefs = cfg
      ? cfg.notificationPrefs || DEF_NOTIFICATION_PREFS
      : DEF_NOTIFICATION_PREFS;
    if (prefs.soundEnabled) {
      playSound(key);
    }
  };

  // --- sendNotification wrapper (must be defined before coopActions) ---
  const sendNotification = useCallback(
    async (data: {
      type: string;
      title: string;
      body: string;
      childId?: string;
      childName?: string;
      targetRole: 'parent' | 'kid';
    }) => {
      await writeNotification(familyId, {
        type: data.type,
        title: data.title,
        body: data.body,
        childId: data.childId || '',
        childName: data.childName || '',
        targetRole: data.targetRole,
      });
    },
    [familyId]
  );

  // --- Compose action hooks (coopActions before taskActions for delegation) ---
  const coopActions = useCoopActions({
    familyId,
    children: cfg ? cfg.children : [],
    tasks: cfg ? cfg.tasks : {},
    coopRequests,
    sendNotification,
    allU,
    cfg,
    saveUsr,
    tierCfg,
    notify: notification.notify,
    playSound: playSoundIfAllowed,
  });

  const taskActions = useTaskActions({
    cfg,
    allU,
    curUser,
    familyId,
    saveUsr,
    notify: notification.notify,
    tp,
    tierCfg,
    getChildName,
    playSound: playSoundIfAllowed,
    coopRequests,
    completeCoopTask: coopActions.completeCoopTask,
  });

  const rewardActions = useRewardActions({
    cfg,
    allU,
    curUser,
    familyId,
    saveUsr,
    notify: notification.notify,
    getChildName: getChildName,
    playSound: playSoundIfAllowed,
  });

  const approvalActions = useApprovalActions({
    allU,
    familyId,
    saveUsr,
    notify: notification.notify,
    getChildName: getChildName,
    playSound: playSoundIfAllowed,
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
          // Re-read config in case profile setup wrote parentPin
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
          const numToLetter: Record<string, string> = {
            '1': 'D',
            '2': 'C',
            '3': 'B',
            '4': 'A',
          };
          const migrated: Record<string, { coins: number; xp: number }> =
            structuredClone(DEF_TIER_CONFIG);
          Object.keys(oldTp).forEach(k => {
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
              taskMigrations.push(
                fsSaveTask(familyId, t.id, { tier: letter } as any)
              );
            }
          });
          let migrationOk = true;
          if (taskMigrations.length > 0) {
            try {
              await Promise.all(taskMigrations);
            } catch (err) {
              console.error(
                'Task tier migration failed, will retry on next load:',
                err
              );
              Sentry.captureException(err, {
                tags: { action: 'tier-migration' },
              });
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
          const code = await generateFamilyCode();
          await registerFamilyCode(code, familyId);
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
            frequency: t.frequency || 'daily',
            dueDays: t.dueDays || [],
            photoRequired: t.photoRequired !== false,
            createdAt: t.createdAt,
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
          referralSource:
            fc && fc.referralSource ? fc.referralSource : undefined,
          notificationPrefs:
            fc && fc.notificationPrefs ? fc.notificationPrefs : undefined,
        };
        if (!c.children) c.children = [];
        if (!c.tierConfig) c.tierConfig = structuredClone(DEF_TIER_CONFIG);

        const users: Record<string, UserData> = {};
        const ws = getWeekStart(c.weeklyResetDay);
        const needsReset = c.lastWeeklyReset < ws;
        for (let i = 0; i < c.children.length; i++) {
          const ch = c.children[i];
          let ud = (await fsGetChildData(familyId, ch.id)) as UserData | null;
          if (!ud) ud = freshUser();
          // Migration: add xp/level fields if missing
          if (ud.xp == null) ud.xp = 0;
          if (ud.level == null) ud.level = 1;
          if (ud.missedDaysThisWeek == null) ud.missedDaysThisWeek = 0;
          if (needsReset) {
            ud.missedDaysThisWeek = 0;
            // Delete photos from Storage before clearing the log
            ((childId: string) => {
              deleteAllChildPhotos(familyId, childId).catch(err => {
                console.warn(`Photo cleanup failed for ${childId}:`, err);
                Sentry.captureException(err, {
                  tags: { action: 'weekly-reset-photo-cleanup', childId },
                });
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
    setCoopRequests,
  });

  // --- In-app notification listener ---
  const notifRole: 'parent' | 'kid' = curUser === 'parent' ? 'parent' : 'kid';
  const notifChildId = curUser && curUser !== 'parent' ? curUser : null;
  const rawPrefs = cfg
    ? cfg.notificationPrefs || DEF_NOTIFICATION_PREFS
    : DEF_NOTIFICATION_PREFS;
  const notifPrefs = useMemo(() => rawPrefs, [JSON.stringify(rawPrefs)]);

  useNotificationListener({
    familyId,
    role: notifRole,
    childId: notifChildId,
    prefs: notifPrefs,
    notify: notification.notify,
    loading,
  });

  // --- Audio unlock on first user interaction ---
  // iOS Safari requires one .play() inside a user gesture to activate
  // the audio session. After that, non-gesture plays work.
  useEffect(() => {
    const handleInteraction = () => {
      unlockAudio();
      preloadSounds();
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
    document.addEventListener('click', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);
    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  // --- Cleanup old notifications and co-op requests on load (parents only) ---
  useEffect(() => {
    if (!familyId || loading || curUser !== 'parent') return;
    cleanupOldNotifications(familyId).catch(err => {
      console.warn('Notification cleanup failed:', err);
      Sentry.captureException(err, {
        level: 'warning',
        tags: { action: 'cleanup-old-notifications' },
      });
    });
    cleanupOldCoopRequests(familyId).catch(err => {
      console.warn('Co-op request cleanup failed:', err);
      Sentry.captureException(err, {
        level: 'warning',
        tags: { action: 'cleanup-old-coop-requests' },
      });
    });
  }, [familyId, loading, curUser]);

  // 30-second tick for bedtime cutoff detection (time-based, not data-based)
  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => t + 1);
    }, 30000);
    return () => {
      clearInterval(id);
    };
  }, []);

  // Bedtime cutoff
  useEffect(() => {
    if (!cfg || loading) return;
    (async () => {
      // Track updated user data across both solo and co-op bedtime loops
      // to prevent co-op loop from overwriting solo penalties with stale data
      const updatedUsers: Record<string, UserData> = {};

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
        tasks.forEach(t => {
          const entry = updated.taskLog[d][t.id];
          // Skip tasks created today — don't penalize for late-added missions
          if (t.createdAt === d) return;
          // Skip tasks with active co-op — handled by co-op bedtime logic below
          if (coopActions.isTaskInActiveCoop(ch.id, t.id, d)) return;
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
            updated.points = Math.max(
              MIN_COINS,
              (updated.points || 0) - tc.coins
            );
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
          updatedUsers[ch.id] = updated;
          await saveUsr(ch.id, updated);
        }
      }
      // --- Co-op bedtime cutoff ---
      if (isPastBedtime(cfg.bedtime)) {
        const d = getToday();
        const approvedCoops = coopRequests.filter(
          r => r.status === 'approved' && r.date === d
        );
        for (const req of approvedCoops) {
          const tc = tierCfg(req.taskTier);
          const kids = [
            {
              id: req.initiatorId,
              done: req.initiatorCompleted,
              logKey: req.taskId,
            },
            {
              id: req.partnerId,
              done: req.partnerCompleted,
              logKey: `coop:${req.id}`,
            },
          ];

          for (const kid of kids) {
            // Use locally-updated data from solo loop if available
            const kidUd = structuredClone(
              updatedUsers[kid.id] ?? allU[kid.id] ?? freshUser()
            ) as UserData;
            if (!kidUd.taskLog) kidUd.taskLog = {};
            if (!kidUd.taskLog[d]) kidUd.taskLog[d] = {};

            // Idempotency: skip if already processed
            const existingEntry = kidUd.taskLog[d][kid.logKey];
            if (existingEntry && existingEntry.coopFailed) continue;

            if (kid.done) {
              // Completer: void held rewards, mark as failed, break streak (no coin deduction)
              kidUd.taskLog[d][kid.logKey] = {
                ...(existingEntry || {
                  completedAt: null,
                  photo: null,
                  rejected: false,
                }),
                status: 'missed',
                points: 0,
                xp: 0,
                coopFailed: true,
                coopRequestId: req.id,
                coopRole: kid.id === req.initiatorId ? 'initiator' : 'partner',
                coopPartnerId:
                  kid.id === req.initiatorId ? req.partnerId : req.initiatorId,
              };
              kidUd.streak = 0;
            } else {
              // Non-completer: normal missed penalty
              kidUd.taskLog[d][kid.logKey] = {
                completedAt: null,
                status: 'missed',
                points: -tc.coins,
                xp: 0,
                photo: null,
                rejected: false,
                autoCutoff: true,
                coopRequestId: req.id,
                coopRole: kid.id === req.initiatorId ? 'initiator' : 'partner',
                coopPartnerId:
                  kid.id === req.initiatorId ? req.partnerId : req.initiatorId,
                coopFailed: true,
              };
              kidUd.points = Math.max(
                MIN_COINS,
                (kidUd.points || 0) - tc.coins
              );
              kidUd.missedDaysThisWeek = (kidUd.missedDaysThisWeek || 0) + 1;
              if (kidUd.missedDaysThisWeek > 1) {
                kidUd.streak = 0;
              }
            }
            updatedUsers[kid.id] = kidUd;
            await saveUsr(kid.id, kidUd);
          }

          // Expire co-op after both kids processed (so failures are retryable)
          await saveCoopRequest(familyId, req.id, { status: 'expired' });

          // Notify both kids
          sendNotification({
            type: 'coop_expired',
            title: 'Co-op Expired',
            body: `The co-op on ${req.taskName} expired at bedtime`,
            childId: req.initiatorId,
            childName: getChildName(req.initiatorId),
            targetRole: 'kid',
          }).catch(e =>
            Sentry.captureException(e, {
              level: 'warning',
              tags: { action: 'coop-notification' },
            })
          );
          sendNotification({
            type: 'coop_expired',
            title: 'Co-op Expired',
            body: `The co-op on ${req.taskName} expired at bedtime`,
            childId: req.partnerId,
            childName: getChildName(req.partnerId),
            targetRole: 'kid',
          }).catch(e =>
            Sentry.captureException(e, {
              level: 'warning',
              tags: { action: 'coop-notification' },
            })
          );
        }
      }
    })();
  });

  // Track co-op request IDs currently being awarded to prevent double-award
  const awardingCoopsRef = useRef<Set<string>>(new Set());

  // Safety effect: award co-op rewards if both kids completed but status is still 'approved'
  // This handles the race condition where both kids complete simultaneously
  useEffect(() => {
    if (!cfg || loading) return;
    const pendingAwards = coopRequests.filter(
      r =>
        r.status === 'approved' &&
        r.initiatorCompleted &&
        r.partnerCompleted &&
        !awardingCoopsRef.current.has(r.id)
    );
    for (const req of pendingAwards) {
      awardingCoopsRef.current.add(req.id);
      coopActions
        .awardCoopRewards(req)
        .catch(err => {
          Sentry.captureException(err, {
            tags: { action: 'coop-safety-award' },
          });
        })
        .finally(() => {
          awardingCoopsRef.current.delete(req.id);
        });
    }
  }, [coopRequests, cfg, loading, coopActions.awardCoopRewards]);

  // Validate restored kid session — promote to dashboard if valid, reset if not
  useEffect(() => {
    if (!loading && cfg && curUser && curUser !== 'parent') {
      const found = cfg.children.some(c => c.id === curUser);
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
  const soloActiveTasks = useMemo(
    () => uTasks.filter(isTaskActiveToday),
    [uTasks]
  );
  const tomorrowTasks = uTasks.filter(
    t => !isTaskActiveToday(t) && isTaskActiveTomorrow(t)
  );
  const d = getToday();

  // Derive virtual co-op tasks for partner kids.
  // Approved coopRequests where curUser is the partner act as virtual task
  // assignments. The virtual task inherits the original task's definition
  // but uses id = "coop:{requestId}" so it doesn't collide with real tasks.
  // If the original task was deleted, skip the virtual task (orphaned co-op).
  const coopVirtualTasks: import('../types.ts').Task[] = useMemo(() => {
    if (!curUser || curUser === 'parent' || !cfg) return [];
    return coopRequests
      .filter(
        r => r.partnerId === curUser && r.status === 'approved' && r.date === d
      )
      .map(r => {
        const initiatorTasks = cfg.tasks[r.initiatorId] || [];
        const original = initiatorTasks.find(t => t.id === r.taskId);
        if (!original) return null;
        return {
          id: `coop:${r.id}`,
          name: r.taskName,
          tier: r.taskTier,
          windowStart: r.windowStartOverride ?? original.windowStart,
          windowEnd: r.windowEndOverride ?? original.windowEnd,
          frequency: original.frequency,
          dueDays: original.dueDays,
          photoRequired: original.photoRequired,
        };
      })
      .filter((t): t is import('../types.ts').Task => t !== null);
  }, [curUser, cfg, coopRequests, d]);

  const activeTasks = useMemo(
    () => [...soloActiveTasks, ...coopVirtualTasks],
    [soloActiveTasks, coopVirtualTasks]
  );

  const tLog =
    currentUserData && currentUserData.taskLog && currentUserData.taskLog[d]
      ? currentUserData.taskLog[d]
      : {};
  const bedLock = isPastBedtime(cfg ? cfg.bedtime : undefined);
  let pendingCount = 0;
  children.forEach(c => {
    const u = allU[c.id];
    if (u && u.pendingRedemptions) pendingCount += u.pendingRedemptions.length;
  });
  // Include co-op requests awaiting parent approval
  pendingCount += coopRequests.filter(
    r => r.status === 'pending_parent'
  ).length;

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
    activeTasks,
    tomorrowTasks,
    tLog,
    pendingCount,
    setScreen,
    navigate,
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
    resetData: childActions.resetData,
    doAddChild: childActions.doAddChild,
    doRemoveChild: childActions.doRemoveChild,
    getChild,
    onLogout: props.onLogout || null,

    // Co-op
    coopRequests,
    requestCoop: coopActions.requestCoop,
    acceptCoop: coopActions.acceptCoop,
    declineCoop: coopActions.declineCoop,
    approveCoop: coopActions.approveCoop,
    denyCoop: coopActions.denyCoop,
    cancelCoop: coopActions.cancelCoop,
    isTaskInActiveCoop: coopActions.isTaskInActiveCoop,
  };

  return (
    <AppContext.Provider value={value}>{props.children}</AppContext.Provider>
  );
}
