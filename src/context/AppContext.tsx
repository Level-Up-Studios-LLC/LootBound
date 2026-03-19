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
import { DEF_TIER_CONFIG, DEF_NOTIFICATION_PREFS } from '../constants.ts';
import { setStorage, removeStorage } from '../services/platform.ts';
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
import { useNotificationListener } from '../hooks/useNotificationListener.ts';
import { unlockAudio, preloadSounds } from '../services/notificationSound.ts';
import { cleanupOldNotifications } from '../services/firestoreStorage.ts';

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

var AppContext = createContext<AppContextValue | null>(null);

export function useAppContext(): AppContextValue {
  var ctx = useContext(AppContext);
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
  var _screen = useState(props.initialScreen || 'login'),
    screen = _screen[0],
    setScreen = _screen[1];
  var _curUser = useState<string | null>(props.initialUser || null),
    curUser = _curUser[0],
    setCurUserRaw = _curUser[1];

  function setCurUser(uid: string | null) {
    setCurUserRaw(uid);
    if (uid && uid !== 'parent') {
      setStorage('qb-kid-session', JSON.stringify({ val: uid, ts: Date.now() }));
    } else if (!uid) {
      removeStorage('qb-kid-session');
      if (props.onLogout) props.onLogout();
    }
  }
  var _cfg = useState<Config | null>(null),
    cfg = _cfg[0],
    setCfg = _cfg[1];
  var _allU = useState<Record<string, UserData>>({}),
    allU = _allU[0],
    setAllU = _allU[1];
  var _load = useState(true),
    loading = _load[0],
    setLoading = _load[1];
  var _tick = useState(0),
    setTick = _tick[1];
  void _tick;
  var _vp = useState<string | null>(null),
    viewPhoto = _vp[0],
    setViewPhoto = _vp[1];
  var familyId = props.familyId;

  // --- Notification hook ---
  var notification = useNotification();

  // --- Helper functions ---
  function getChild(id: string): Child | null {
    if (!cfg || !cfg.children) return null;
    return (
      cfg.children.find(function (c) {
        return c.id === id;
      }) || null
    );
  }

  function tierCfg(tier: string): TierConfig {
    var tc = cfg && cfg.tierConfig ? cfg.tierConfig[tier] : null;
    if (tc) return tc;
    var def = DEF_TIER_CONFIG[tier];
    return def || { coins: 0, xp: 0 };
  }

  function tp(tier: string): number {
    return tierCfg(tier).coins;
  }

  // --- Persistence ---
  async function saveUsr(uid: string, data: UserData) {
    setAllU(function (p) {
      var o: Record<string, UserData> = {};
      for (var k in p) o[k] = p[k];
      o[uid] = data;
      return o;
    });
    await fsSaveChildData(familyId, uid, data);
  }

  async function saveCfg(newCfg: Config) {
    var oldCfg = cfg;
    setCfg(newCfg);
    await syncCfgToFirestore(oldCfg, newCfg);
  }

  async function syncCfgToFirestore(
    oldCfg: Config | null,
    newCfg: Config
  ) {
    var promises: Promise<void>[] = [];

    var cfgFields: Record<string, any> = {
      tierConfig: newCfg.tierConfig,
      approvalThreshold: newCfg.approvalThreshold,
      lastWeeklyReset: newCfg.lastWeeklyReset,
    };
    if (newCfg.bedtime != null) cfgFields.bedtime = newCfg.bedtime;
    if (newCfg.weeklyResetDay != null)
      cfgFields.weeklyResetDay = newCfg.weeklyResetDay;
    if (newCfg.cooldown != null) cfgFields.cooldown = newCfg.cooldown;
    if (newCfg.notificationPrefs) cfgFields.notificationPrefs = newCfg.notificationPrefs;
    promises.push(fsSaveConfig(familyId, cfgFields));

    (newCfg.children || []).forEach(function (ch) {
      promises.push(fsSaveChild(familyId, ch.id, ch));
    });
    if (oldCfg) {
      var newChildIds: Record<string, boolean> = {};
      (newCfg.children || []).forEach(function (ch) {
        newChildIds[ch.id] = true;
      });
      (oldCfg.children || []).forEach(function (ch) {
        if (!newChildIds[ch.id])
          promises.push(fsDeleteChild(familyId, ch.id));
      });
    }

    var newTaskIds: Record<string, boolean> = {};
    Object.keys(newCfg.tasks || {}).forEach(function (cid) {
      (newCfg.tasks[cid] || []).forEach(function (t) {
        newTaskIds[t.id] = true;
        promises.push(
          fsSaveTask(familyId, t.id, Object.assign({ childId: cid }, t))
        );
      });
    });
    if (oldCfg) {
      Object.keys(oldCfg.tasks || {}).forEach(function (cid) {
        (oldCfg!.tasks[cid] || []).forEach(function (t) {
          if (!newTaskIds[t.id])
            promises.push(fsDeleteTask(familyId, t.id));
        });
      });
    }

    var newRewardIds: Record<string, boolean> = {};
    (newCfg.rewards || []).forEach(function (r) {
      newRewardIds[r.id] = true;
      promises.push(fsSaveReward(familyId, r.id, r));
    });
    if (oldCfg) {
      (oldCfg.rewards || []).forEach(function (r) {
        if (!newRewardIds[r.id])
          promises.push(fsDeleteReward(familyId, r.id));
      });
    }

    await Promise.all(promises);
  }

  // --- Helper to get child name by ID ---
  function getChildName(id: string): string {
    var ch = getChild(id);
    return ch ? ch.name : id;
  }

  // --- Compose action hooks ---
  var taskActions = useTaskActions({
    cfg: cfg,
    allU: allU,
    curUser: curUser,
    familyId: familyId,
    saveUsr: saveUsr,
    notify: notification.notify,
    tp: tp,
    tierCfg: tierCfg,
    getChildName: getChildName,
  });

  var rewardActions = useRewardActions({
    cfg: cfg,
    allU: allU,
    curUser: curUser,
    familyId: familyId,
    saveUsr: saveUsr,
    notify: notification.notify,
    getChildName: getChildName,
  });

  var approvalActions = useApprovalActions({
    allU: allU,
    familyId: familyId,
    saveUsr: saveUsr,
    notify: notification.notify,
    getChildName: getChildName,
  });

  var childActions = useChildActions({
    cfg: cfg,
    allU: allU,
    familyId: familyId,
    saveCfg: saveCfg,
    saveUsr: saveUsr,
    setAllU: setAllU,
    notify: notification.notify,
    getChild: getChild,
  });

  // --- Initial data load from Firestore ---
  useEffect(function () {
    if (!familyId) return;
    var dead = false;
    (async function () {
      var fc = await fsGetConfig(familyId);
      var fsChildren = await fsGetChildren(familyId);
      var fsTasks = await fsGetTasks(familyId);
      var fsRewards = await fsGetRewards(familyId);

      var needsSeed = !fc && fsChildren.length === 0;
      if (needsSeed) {
        // Re-read config in case CreatePinPrompt wrote parentPin
        // between our initial read and now
        var freshCfg = await fsGetConfig(familyId);
        var defConfig = {
          parentPin: '',
          tierConfig: JSON.parse(JSON.stringify(DEF_TIER_CONFIG)),
          approvalThreshold: 300,
          lastWeeklyReset: getWeekStart(),
        };
        // merge: true in fsSaveConfig preserves any existing parentPin
        await fsSaveConfig(familyId, defConfig);
        fc = freshCfg ? Object.assign({}, defConfig, freshCfg) : defConfig;
      } else if (fc) {
        // Config doc exists (e.g. parentPin was saved during signup)
        // but may be missing seed defaults — fill them in without
        // overwriting fields that already have values.
        var patches: Record<string, any> = {};
        if (!(fc as any).tierConfig) {
          patches.tierConfig = JSON.parse(JSON.stringify(DEF_TIER_CONFIG));
        }
        if (fc.approvalThreshold == null) {
          patches.approvalThreshold = 300;
        }
        if (!fc.lastWeeklyReset) {
          patches.lastWeeklyReset = getWeekStart();
        }
        if (Object.keys(patches).length > 0) {
          await fsSaveConfig(familyId, patches);
          fc = Object.assign({}, fc, patches);
        }
      }

      // Migration: tierPoints (numeric) -> tierConfig (letter-based)
      if (fc && !(fc as any).tierConfig && (fc as any).tierPoints) {
        var oldTp = (fc as any).tierPoints;
        var numToLetter: Record<string, string> = { '1': 'D', '2': 'C', '3': 'B', '4': 'A' };
        var migrated: Record<string, { coins: number; xp: number }> = JSON.parse(JSON.stringify(DEF_TIER_CONFIG));
        Object.keys(oldTp).forEach(function (k) {
          var letter = numToLetter[k];
          if (letter && migrated[letter]) {
            migrated[letter].coins = oldTp[k];
          }
        });
        // Migrate task tiers from numeric to letter first
        var taskMigrations: Promise<void>[] = [];
        fsTasks.forEach(function (t: any) {
          var letter = numToLetter[String(t.tier)];
          if (letter) {
            t.tier = letter;
            taskMigrations.push(fsSaveTask(familyId, t.id, { tier: letter } as any));
          }
        });
        var migrationOk = true;
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
        var genCode = await import('../services/familyCode.ts');
        var code = await genCode.generateFamilyCode();
        await genCode.registerFamilyCode(code, familyId);
        (fc as any).familyCode = code;
        // Persist family code on the config doc so deleteFamily can find it
        await fsSaveConfig(familyId, { familyCode: code } as any);
      }

      var tasksMap: Record<string, import('../types.ts').Task[]> = {};
      fsTasks.forEach(function (t: any) {
        var cid = t.childId || '';
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

      var c: Config = {
        children: fsChildren as Child[],
        tasks: tasksMap,
        rewards: fsRewards as Reward[],
        parentPin: fc && fc.parentPin ? fc.parentPin : '',
        tierConfig:
          fc && fc.tierConfig
            ? fc.tierConfig
            : JSON.parse(JSON.stringify(DEF_TIER_CONFIG)),
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
        notificationPrefs: fc && fc.notificationPrefs ? fc.notificationPrefs : undefined,
      };
      if (!c.children) c.children = [];
      if (!c.tierConfig) c.tierConfig = JSON.parse(JSON.stringify(DEF_TIER_CONFIG));

      var users: Record<string, UserData> = {};
      var ws = getWeekStart(c.weeklyResetDay);
      var needsReset = c.lastWeeklyReset < ws;
      for (var i = 0; i < c.children.length; i++) {
        var ch = c.children[i];
        var ud =
          (await fsGetChildData(familyId, ch.id)) as UserData | null;
        if (!ud) ud = freshUser();
        // Migration: add xp/level fields if missing
        if (ud.xp == null) ud.xp = 0;
        if (ud.level == null) ud.level = 1;
        if (ud.missedDaysThisWeek == null) ud.missedDaysThisWeek = 0;
        if (needsReset) {
          ud.missedDaysThisWeek = 0;
          // Delete photos from Storage before clearing the log
          (function (childId: string) {
            deleteAllChildPhotos(familyId, childId).catch(function (err) {
              console.warn('Photo cleanup failed for ' + childId + ':', err);
              Sentry.captureException(err, { tags: { action: 'weekly-reset-photo-cleanup', childId: childId } });
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
    })();
    return function () {
      dead = true;
    };
  }, [familyId]);

  // --- Real-time Firestore sync ---
  useFirestoreSync({
    familyId: familyId,
    loading: loading,
    setCfg: setCfg,
    setAllU: setAllU,
  });

  // --- In-app notification listener ---
  var notifRole: 'parent' | 'kid' = curUser === 'parent' ? 'parent' : 'kid';
  var notifChildId = curUser && curUser !== 'parent' ? curUser : null;
  var notifPrefs = cfg ? cfg.notificationPrefs || DEF_NOTIFICATION_PREFS : DEF_NOTIFICATION_PREFS;

  useNotificationListener({
    familyId: familyId,
    role: notifRole,
    childId: notifChildId,
    prefs: notifPrefs,
    notify: notification.notify,
    loading: loading,
  });

  // --- Audio unlock on first user interaction ---
  // iOS Safari requires one .play() inside a user gesture to activate
  // the audio session. After that, non-gesture plays work.
  useEffect(function () {
    function handleInteraction() {
      unlockAudio();
      preloadSounds();
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    }
    document.addEventListener('click', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);
    return function () {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  // --- Cleanup old notifications on load ---
  useEffect(function () {
    if (!familyId || loading) return;
    cleanupOldNotifications(familyId).catch(function () { /* ignore */ });
  }, [familyId, loading]);

  // 30-second tick for bedtime cutoff detection (time-based, not data-based)
  useEffect(function () {
    var id = setInterval(function () {
      setTick(function (t) {
        return t + 1;
      });
    }, 30000);
    return function () {
      clearInterval(id);
    };
  }, []);

  // Bedtime cutoff
  useEffect(function () {
    if (!cfg || loading) return;
    (async function () {
      for (var i = 0; i < cfg.children.length; i++) {
        var ch = cfg.children[i];
        var ud = allU[ch.id];
        if (!ud) continue;
        if (!isPastBedtime(cfg.bedtime)) continue;
        var d = getToday();
        var log = ud.taskLog && ud.taskLog[d] ? ud.taskLog[d] : {};
        if (log._bedtimeApplied) continue;
        var updated = JSON.parse(JSON.stringify(ud)) as UserData;
        if (!updated.taskLog) updated.taskLog = {};
        if (!updated.taskLog[d]) updated.taskLog[d] = {};
        var tasks = (cfg.tasks[ch.id] || []).filter(isTaskActiveToday);
        var changed = false;
        tasks.forEach(function (t) {
          var entry = updated.taskLog[d][t.id];
          if (!entry || entry.rejected) {
            var tc = tierCfg(t.tier);
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
  useEffect(function () {
    if (!loading && cfg && curUser && curUser !== 'parent') {
      var found = cfg.children.some(function (c) { return c.id === curUser; });
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
  var children = cfg ? cfg.children : [];
  var currentChild =
    curUser && curUser !== 'parent' ? getChild(curUser) : null;
  var currentUserData =
    curUser && curUser !== 'parent' ? allU[curUser] || null : null;
  var uTasks =
    curUser && curUser !== 'parent' && cfg ? cfg.tasks[curUser] || [] : [];
  var todayTasks = uTasks.filter(isTaskActiveToday);
  var d = getToday();
  var tLog =
    currentUserData && currentUserData.taskLog && currentUserData.taskLog[d]
      ? currentUserData.taskLog[d]
      : {};
  var bedLock = isPastBedtime(cfg ? cfg.bedtime : undefined);
  var pendingCount = 0;
  children.forEach(function (c) {
    var u = allU[c.id];
    if (u && u.pendingRedemptions) pendingCount += u.pendingRedemptions.length;
  });

  var value: AppContextValue = {
    familyId: familyId,
    cfg: cfg,
    allU: allU,
    curUser: curUser,
    screen: screen,
    loading: loading,
    bedLock: bedLock,
    notif: notification.notif,
    viewPhoto: viewPhoto,
    fileRef: taskActions.fileRef,
    children: children,
    currentChild: currentChild,
    currentUserData: currentUserData,
    todayTasks: todayTasks,
    tLog: tLog,
    pendingCount: pendingCount,
    setScreen: setScreen,
    setCurUser: setCurUser,
    setViewPhoto: setViewPhoto,
    notify: notification.notify,
    tp: tp,
    tierCfg: tierCfg,
    saveCfg: saveCfg,
    saveUsr: saveUsr,
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
    getChild: getChild,
    onLogout: props.onLogout || null,
  };

  return (
    <AppContext.Provider value={value}>{props.children}</AppContext.Provider>
  );
}
