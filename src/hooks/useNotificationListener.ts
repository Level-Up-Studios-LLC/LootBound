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

function isEligible(
  n: { targetRole: string; childId?: string; type: string; read: boolean },
  role: string,
  childId: string | null | undefined,
  prefs: NotificationPrefs
): boolean {
  if (n.read) return false;
  if (n.targetRole !== role) return false;
  if (n.targetRole === 'kid' && n.childId && childId && n.childId !== childId) return false;
  var typeKey = n.type.replace(/_([a-z])/g, function (_: string, c: string) {
    return c.toUpperCase();
  }) as keyof NotificationPrefs;
  if (typeKey !== 'soundEnabled' && prefs[typeKey] === false) return false;
  return true;
}

export function useNotificationListener(deps: NotificationListenerDeps) {
  var seenRef = useRef<Set<string>>(new Set());
  var firstSnapshotRef = useRef(true);
  var prefsRef = useRef<NotificationPrefs>(deps.prefs || DEF_NOTIFICATION_PREFS);
  prefsRef.current = deps.prefs || DEF_NOTIFICATION_PREFS;

  useEffect(function () {
    if (!deps.familyId || deps.loading) return;

    firstSnapshotRef.current = true;

    var unsub = onNotificationsSnapshot(deps.familyId, function (list) {
      var prefs = prefsRef.current;

      if (firstSnapshotRef.current) {
        firstSnapshotRef.current = false;
        // On first snapshot, surface unread eligible notifications and mark all as seen
        list.forEach(function (n) {
          if (!seenRef.current.has(n.id) && isEligible(n, deps.role, deps.childId, prefs)) {
            var toastType = n.type === 'level_up' ? 'levelup' : (
              n.type === 'mission_rejected' || n.type === 'loot_denied' ? 'error' : 'success'
            );
            deps.notify(n.body || n.title, toastType);
            if (prefs.soundEnabled) {
              playSound(notifTypeToSound(n.type));
            }
            markNotificationRead(deps.familyId, n.id).catch(function () { /* ignore */ });
          }
          seenRef.current.add(n.id);
        });
        return;
      }

      list.forEach(function (n) {
        if (seenRef.current.has(n.id)) return;

        if (!isEligible(n, deps.role, deps.childId, prefs)) return;

        seenRef.current.add(n.id);

        var toastType = n.type === 'level_up' ? 'levelup' : (
          n.type === 'mission_rejected' || n.type === 'loot_denied' ? 'error' : 'success'
        );
        deps.notify(n.body || n.title, toastType);

        if (prefs.soundEnabled) {
          playSound(notifTypeToSound(n.type));
        }

        markNotificationRead(deps.familyId, n.id).catch(function () { /* ignore */ });
      });
    });

    return function () {
      unsub();
    };
  }, [deps.familyId, deps.role, deps.childId, deps.loading]);
}
