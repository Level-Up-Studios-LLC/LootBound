import React, { useState, useRef } from 'react';
import * as Sentry from '@sentry/react';
import type { Config, TierConfig, UserData } from '../types.ts';
import { COOLDOWN, SL } from '../constants.ts';
import {
  freshUser,
  getToday,
  nowMin,
  nowSec,
  timeToMin,
  prevDate,
  isPastBedtime,
  isTaskActiveToday,
  calcRewards,
  getStreakMultiplier,
  getLevelFromXp,
  getLevelCoinBonus,
  getLevelTitle,
  resizeImg,
} from '../utils.ts';
import { uploadTaskPhoto, deleteTaskPhoto } from '../services/photoStorage.ts';
import { writeNotification } from '../services/firestoreStorage.ts';
import {
  capturePhoto as nativeCapturePhoto,
  triggerHaptic,
  isNative,
} from '../services/platform.ts';
import type { SoundKey } from '../services/notificationSound.ts';

interface TaskActionsDeps {
  cfg: Config | null;
  allU: Record<string, UserData>;
  curUser: string | null;
  familyId: string;
  saveUsr: (uid: string, data: UserData) => Promise<void>;
  notify: (msg: string, type?: string) => void;
  tp: (tier: string) => number;
  tierCfg: (tier: string) => TierConfig;
  getChildName?: (id: string) => string;
  playSound: (key: SoundKey) => void;
}

export function useTaskActions(deps: TaskActionsDeps) {
  const [capturing, setCapturing] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const startCapture = (taskId: string) => {
    const cfgBedtime = deps.cfg ? deps.cfg.bedtime : undefined;
    const cfgCooldown =
      deps.cfg && deps.cfg.cooldown != null ? deps.cfg.cooldown : COOLDOWN;
    if (isPastBedtime(cfgBedtime)) {
      deps.notify('Past bedtime. Missions locked.', 'error');
      return;
    }
    const ud = deps.allU[deps.curUser!];
    const now = nowSec();
    if (ud && ud.lastTaskTime && now - ud.lastTaskTime < cfgCooldown) {
      deps.notify(`Wait ${cfgCooldown - (now - ud.lastTaskTime)}s`, 'error');
      return;
    }
    setCapturing(taskId);
    if (isNative()) {
      nativeCapturePhoto()
        .then((photo) => {
          if (photo) {
            doComplete(taskId, photo)
              .then(() => {
                setCapturing(null);
              })
              .catch((err) => {
                console.error('doComplete failed:', err);
                setCapturing(null);
              });
          } else {
            setCapturing(null);
          }
        })
        .catch((err) => {
          console.error('nativeCapturePhoto failed:', err);
          setCapturing(null);
        });
    } else {
      if (fileRef.current) {
        fileRef.current.value = '';
        fileRef.current.click();
      } else {
        setCapturing(null);
      }
    }
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !capturing) {
      setCapturing(null);
      return;
    }
    resizeImg(file, 800)
      .then(photo => {
        return doComplete(capturing!, photo);
      })
      .then(() => {
        setCapturing(null);
        if (fileRef.current) fileRef.current.value = '';
      })
      .catch(err => {
        console.warn('Photo capture failed:', err);
        setCapturing(null);
        if (fileRef.current) fileRef.current.value = '';
      });
  };

  const doComplete = async (taskId: string, photo: string | null) => {
    const uid = deps.curUser;
    if (!uid || uid === 'parent' || !deps.cfg) return;
    if (isPastBedtime(deps.cfg ? deps.cfg.bedtime : undefined)) {
      deps.notify('Past bedtime.', 'error');
      return;
    }
    const ud = structuredClone(deps.allU[uid] || freshUser()) as UserData;
    const d = getToday();
    if (!ud.taskLog) ud.taskLog = {};
    if (!ud.taskLog[d]) ud.taskLog[d] = {};
    const task = (deps.cfg.tasks[uid] || []).find(t => t.id === taskId);
    if (!task) return;
    const ex = ud.taskLog[d][taskId];
    if (ex && !ex.rejected) return;
    const now = nowMin();
    let status: string;
    if (now < timeToMin(task.windowStart)) status = 'early';
    else if (
      now <=
      Math.min(
        timeToMin(task.windowEnd),
        deps.cfg.bedtime != null ? deps.cfg.bedtime : 21 * 60
      )
    )
      status = 'ontime';
    else status = 'late';

    // Upload photo to Firebase Storage and get download URL
    let photoUrl: string | null = null;
    if (photo) {
      try {
        photoUrl = await uploadTaskPhoto(deps.familyId, uid, d, taskId, photo);
      } catch (err) {
        console.warn('Photo upload failed, storing locally:', err);
        Sentry.captureException(err, { tags: { action: 'photo-upload' } });
        photoUrl = photo; // fallback to base64 if upload fails
      }
    }

    const tc = deps.tierCfg(task.tier);
    const rewards = calcRewards(tc, status);
    // Apply level coin bonus
    const lvlBonus = getLevelCoinBonus(ud.level || 1);
    const coins =
      lvlBonus > 0
        ? Math.round(rewards.coins * (1 + lvlBonus / 100))
        : rewards.coins;
    // Apply streak XP multiplier
    const streakMult = getStreakMultiplier(ud.streak || 0);
    const xp = Math.round(rewards.xp * streakMult);
    ud.taskLog[d][taskId] = {
      completedAt: now,
      status,
      points: coins,
      xp,
      photo: photoUrl,
      rejected: false,
    };
    ud.points = (ud.points || 0) + coins;
    ud.xp = (ud.xp || 0) + xp;
    // Check for level up
    const oldLevel = ud.level || 1;
    ud.level = getLevelFromXp(ud.xp);
    ud.lastTaskTime = nowSec();
    const todayActive = (deps.cfg.tasks[uid] || []).filter(isTaskActiveToday);
    const allDone = todayActive.every(t => {
      const l = ud.taskLog[d] && ud.taskLog[d][t.id];
      return l && !l.rejected;
    });
    const noneMissed = todayActive.every(t => {
      const l = ud.taskLog[d] && ud.taskLog[d][t.id];
      return l && l.status !== 'missed' && !l.rejected;
    });
    if (allDone && noneMissed) {
      if (ud.lastPerfectDate === prevDate(d)) {
        ud.streak = (ud.streak || 0) + 1;
      } else if (ud.lastPerfectDate !== d) {
        ud.streak = 1;
      }
      ud.lastPerfectDate = d;
      if (ud.streak > (ud.bestStreak || 0)) ud.bestStreak = ud.streak;
      if (ud.streak === 3) {
        ud.points += 20;
        deps.notify('+20: 3-day streak!', 'streak');
        deps.playSound('streak');
      } else if (ud.streak === 7) {
        ud.points += 75;
        deps.notify('+75: 7-day streak!', 'streak');
        deps.playSound('streak');
      } else if (ud.streak === 15) {
        ud.points += 150;
        deps.notify('+150: 15-day streak!', 'streak');
        deps.playSound('streak');
      } else if (ud.streak === 30) {
        ud.points += 300;
        deps.notify('+300: 30-day streak!', 'streak');
        deps.playSound('streak');
      }
    }
    await deps.saveUsr(uid, ud);
    // Haptic feedback + sound on task completion

    triggerHaptic('success');
    deps.playSound('success');
    // Notify with coins + XP, and level-up if applicable
    const sl = SL[status] || {};
    let msg = `${sl.text || ''}: ${coins > 0 ? '+' : ''}${coins} coins, +${xp} XP`;
    if (streakMult > 1) msg += ` (${streakMult}x)`;
    deps.notify(msg);
    // Write in-app notification for parent
    const childName = deps.getChildName ? deps.getChildName(uid) : uid;
    writeNotification(deps.familyId, {
      type: 'mission_complete',
      title: 'Mission Complete',
      body: `${childName} completed ${task.name} (${sl.text || status})`,
      childId: uid,
      childName,
      targetRole: 'parent',
    }).catch(err => {
      console.warn('Notification failed (mission_complete):', err);
    });
    if (ud.level > oldLevel) {
      const title = getLevelTitle(ud.level);
      deps.notify(`LEVEL UP! Lv.${ud.level} ${title.title}!`, 'levelup');

      triggerHaptic('medium');
      deps.playSound('levelup');
      writeNotification(deps.familyId, {
        type: 'level_up',
        title: 'Level Up!',
        body: `${childName} reached Lv.${ud.level} ${title.title}!`,
        childId: uid,
        childName,
        targetRole: 'parent',
      }).catch(err => {
        console.warn('Notification failed (level_up):', err);
      });
    }
    // Streak notifications
    if (
      allDone &&
      noneMissed &&
      (ud.streak === 3 ||
        ud.streak === 7 ||
        ud.streak === 15 ||
        ud.streak === 30)
    ) {
      writeNotification(deps.familyId, {
        type: 'streak',
        title: 'Streak Milestone!',
        body: `${childName} hit a ${ud.streak}-day streak!`,
        childId: uid,
        childName,
        targetRole: 'parent',
      }).catch(err => {
        console.warn('Notification failed (streak):', err);
      });
    }
  };

  const rejectTask = async (uid: string, taskId: string) => {
    const ud = structuredClone(deps.allU[uid] || freshUser()) as UserData;
    const d = getToday();
    if (!ud.taskLog || !ud.taskLog[d] || !ud.taskLog[d][taskId]) return;
    const entry = ud.taskLog[d][taskId];
    if (entry.rejected) return;

    // Delete photo from Firebase Storage if it's a Storage URL
    if (entry.photo && entry.photo.indexOf('firebasestorage') !== -1) {
      deleteTaskPhoto(deps.familyId, uid, d, taskId).catch(err => {
        console.warn('Photo delete failed:', err);
        Sentry.captureException(err, { tags: { action: 'photo-delete' } });
      });
    }

    ud.points = (ud.points || 0) - (entry.points || 0);
    ud.xp = Math.max(0, (ud.xp || 0) - (entry.xp || 0));
    ud.level = getLevelFromXp(ud.xp);
    entry.rejected = true;
    entry.photo = null;
    await deps.saveUsr(uid, ud);

    triggerHaptic('error');
    deps.playSound('error');
    // Write in-app notification for kid
    const childName = deps.getChildName ? deps.getChildName(uid) : uid;
    let taskName = '';
    if (deps.cfg) {
      const tasks = deps.cfg.tasks[uid] || [];
      const found = tasks.find(t => t.id === taskId);
      if (found) taskName = found.name;
    }
    writeNotification(deps.familyId, {
      type: 'mission_rejected',
      title: 'Mission Rejected',
      body: `${taskName || 'A mission'} was rejected. Try again!`,
      childId: uid,
      childName,
      targetRole: 'kid',
    }).catch(err => {
      console.warn('Notification failed (mission_rejected):', err);
    });
  };

  return {
    fileRef,
    startCapture,
    handlePhoto,
    doComplete,
    rejectTask,
  };
}
