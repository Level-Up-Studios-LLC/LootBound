import { useEffect, useRef } from 'react';
import type { NotificationPrefs } from '../types.ts';
import { DEF_NOTIFICATION_PREFS } from '../constants.ts';
import {
  onNotificationsSnapshot,
  markNotificationRead,
} from '../services/firestoreStorage.ts';
import { playSound, notifTypeToSound } from '../services/notificationSound.ts';

interface NotificationListenerDeps {
  familyId: string;
  role: 'parent' | 'kid';
  childId?: string | null;
  prefs?: NotificationPrefs;
  notify: (msg: string, type?: string) => void;
  loading: boolean;
}

export function useNotificationListener(deps: NotificationListenerDeps) {
  var seenRef = useRef<Set<string>>(new Set());
  var firstSnapshotRef = useRef(true);

  useEffect(function () {
    if (!deps.familyId || deps.loading) return;

    firstSnapshotRef.current = true;

    var unsub = onNotificationsSnapshot(deps.familyId, function (list) {
      if (firstSnapshotRef.current) {
        firstSnapshotRef.current = false;
        list.forEach(function (n) {
          seenRef.current.add(n.id);
        });
        return;
      }

      var prefs = deps.prefs || DEF_NOTIFICATION_PREFS;

      list.forEach(function (n) {
        if (seenRef.current.has(n.id)) return;
        seenRef.current.add(n.id);

        if (n.targetRole !== deps.role) return;
        if (n.targetRole === 'kid' && n.childId && deps.childId && n.childId !== deps.childId) return;

        var typeKey = n.type.replace(/_([a-z])/g, function (_: string, c: string) {
          return c.toUpperCase();
        }) as keyof NotificationPrefs;
        if (typeKey !== 'soundEnabled' && prefs[typeKey] === false) return;

        var toastType = n.type === 'level_up' ? 'levelup' : (
          n.type === 'mission_rejected' || n.type === 'loot_denied' ? 'error' : 'success'
        );
        deps.notify(n.body || n.title, toastType);

        if (prefs.soundEnabled) {
          var soundKey = notifTypeToSound(n.type);
          playSound(soundKey);
        }

        markNotificationRead(deps.familyId, n.id).catch(function () { /* ignore */ });
      });
    });

    return function () {
      unsub();
    };
  }, [deps.familyId, deps.role, deps.childId, deps.loading]);
}
