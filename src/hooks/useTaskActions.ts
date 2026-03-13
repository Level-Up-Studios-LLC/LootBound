import React, { useState, useRef } from 'react';
import type { Config, UserData } from '../types.ts';
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
  calcPts,
  resizeImg,
} from '../utils.ts';
import {
  uploadTaskPhoto,
  deleteTaskPhoto,
} from '../services/photoStorage.ts';

interface TaskActionsDeps {
  cfg: Config | null;
  allU: Record<string, UserData>;
  curUser: string | null;
  familyId: string;
  saveUsr: (uid: string, data: UserData) => Promise<void>;
  notify: (msg: string, type?: string) => void;
  tp: (tier: number) => number;
}

export function useTaskActions(deps: TaskActionsDeps) {
  var _cap = useState<string | null>(null),
    capturing = _cap[0],
    setCapturing = _cap[1];
  var fileRef = useRef<HTMLInputElement | null>(null);

  function startCapture(taskId: string) {
    var cfgBedtime = deps.cfg ? deps.cfg.bedtime : undefined;
    var cfgCooldown =
      deps.cfg && deps.cfg.cooldown != null ? deps.cfg.cooldown : COOLDOWN;
    if (isPastBedtime(cfgBedtime)) {
      deps.notify('Past bedtime. Tasks locked.', 'error');
      return;
    }
    var ud = deps.allU[deps.curUser!];
    var now = nowSec();
    if (ud && ud.lastTaskTime && now - ud.lastTaskTime < cfgCooldown) {
      deps.notify(
        'Wait ' + (cfgCooldown - (now - ud.lastTaskTime)) + 's',
        'error'
      );
      return;
    }
    setCapturing(taskId);
    if (fileRef.current) {
      fileRef.current.value = '';
      fileRef.current.click();
    }
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    var file = e.target.files && e.target.files[0];
    if (!file || !capturing) {
      setCapturing(null);
      return;
    }
    resizeImg(file, 800).then(function (photo) {
      doComplete(capturing!, photo).then(function () {
        setCapturing(null);
        if (fileRef.current) fileRef.current.value = '';
      });
    });
  }

  async function doComplete(taskId: string, photo: string | null) {
    var uid = deps.curUser;
    if (!uid || uid === 'parent' || !deps.cfg) return;
    if (isPastBedtime(deps.cfg ? deps.cfg.bedtime : undefined)) {
      deps.notify('Past bedtime.', 'error');
      return;
    }
    var ud = JSON.parse(
      JSON.stringify(deps.allU[uid] || freshUser())
    ) as UserData;
    var d = getToday();
    if (!ud.taskLog) ud.taskLog = {};
    if (!ud.taskLog[d]) ud.taskLog[d] = {};
    var task = (deps.cfg.tasks[uid] || []).find(function (t) {
      return t.id === taskId;
    });
    if (!task) return;
    var ex = ud.taskLog[d][taskId];
    if (ex && !ex.rejected) return;
    var now = nowMin();
    var status: string;
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
    var photoUrl: string | null = null;
    if (photo) {
      try {
        photoUrl = await uploadTaskPhoto(deps.familyId, uid, d, taskId, photo);
      } catch (err) {
        console.warn('Photo upload failed, storing locally:', err);
        photoUrl = photo; // fallback to base64 if upload fails
      }
    }

    var bp = deps.tp(task.tier);
    var pts = calcPts(bp, status);
    ud.taskLog[d][taskId] = {
      completedAt: now,
      status: status,
      points: pts,
      photo: photoUrl,
      rejected: false,
    };
    ud.points = (ud.points || 0) + pts;
    ud.lastTaskTime = nowSec();
    var todayActive = (deps.cfg.tasks[uid] || []).filter(isTaskActiveToday);
    var allDone = todayActive.every(function (t) {
      var l = ud.taskLog[d] && ud.taskLog[d][t.id];
      return l && !l.rejected;
    });
    var noneMissed = todayActive.every(function (t) {
      var l = ud.taskLog[d] && ud.taskLog[d][t.id];
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
        deps.notify('+20: 3-day streak!');
      } else if (ud.streak === 7) {
        ud.points += 75;
        deps.notify('+75: 7-day streak!');
      } else if (ud.streak === 30) {
        ud.points += 300;
        deps.notify('+300: 30-day streak!');
      }
    }
    await deps.saveUsr(uid, ud);
    var sl = SL[status] || {};
    deps.notify((sl.text || '') + ': ' + (pts > 0 ? '+' : '') + pts + ' pts');
  }

  async function rejectTask(uid: string, taskId: string) {
    var ud = JSON.parse(
      JSON.stringify(deps.allU[uid] || freshUser())
    ) as UserData;
    var d = getToday();
    if (!ud.taskLog || !ud.taskLog[d] || !ud.taskLog[d][taskId]) return;
    var entry = ud.taskLog[d][taskId];
    if (entry.rejected) return;

    // Delete photo from Firebase Storage if it's a Storage URL
    if (entry.photo && entry.photo.indexOf('firebasestorage') !== -1) {
      deleteTaskPhoto(deps.familyId, uid, d, taskId).catch(function (err) {
        console.warn('Photo delete failed:', err);
      });
    }

    ud.points = (ud.points || 0) - (entry.points || 0);
    entry.rejected = true;
    entry.photo = null;
    await deps.saveUsr(uid, ud);
  }

  return {
    fileRef: fileRef,
    startCapture: startCapture,
    handlePhoto: handlePhoto,
    doComplete: doComplete,
    rejectTask: rejectTask,
  };
}
