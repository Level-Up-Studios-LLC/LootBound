import { useEffect, useRef } from 'react';
import type { Config, Child, Task, Reward, UserData } from '../types.ts';
import {
  onConfigSnapshot,
  onChildrenSnapshot,
  onTasksSnapshot,
  onRewardsSnapshot,
  onChildDataSnapshot,
} from '../services/firestoreStorage.ts';

interface FirestoreSyncDeps {
  familyId: string;
  loading: boolean;
  setCfg: (fn: (prev: Config | null) => Config | null) => void;
  setAllU: (fn: (prev: Record<string, UserData>) => Record<string, UserData>) => void;
}

/**
 * Attaches Firestore onSnapshot listeners after the initial load completes.
 * Updates cfg and allU in real time so changes from other devices appear
 * without a refresh.
 */
export function useFirestoreSync(deps: FirestoreSyncDeps) {
  var familyId = deps.familyId;
  var loading = deps.loading;
  var setCfg = deps.setCfg;
  var setAllU = deps.setAllU;

  // Track child IDs so we can add/remove per-child listeners dynamically
  var childUnsubsRef = useRef<Record<string, () => void>>({});

  useEffect(function () {
    if (!familyId || loading) return;

    var dead = false;

    // --- Config listener ---
    var unsubConfig = onConfigSnapshot(familyId, function (fc) {
      if (dead) return;
      setCfg(function (prev) {
        if (!prev || !fc) return prev;
        return Object.assign({}, prev, {
          parentPin: fc.parentPin != null ? fc.parentPin : prev.parentPin,
          tierConfig: fc.tierConfig || prev.tierConfig,
          approvalThreshold:
            fc.approvalThreshold != null
              ? fc.approvalThreshold
              : prev.approvalThreshold,
          lastWeeklyReset: fc.lastWeeklyReset || prev.lastWeeklyReset,
          bedtime: fc.bedtime != null ? fc.bedtime : prev.bedtime,
          weeklyResetDay:
            fc.weeklyResetDay != null ? fc.weeklyResetDay : prev.weeklyResetDay,
          cooldown: fc.cooldown != null ? fc.cooldown : prev.cooldown,
          familyCode: fc.familyCode || prev.familyCode,
          parentName:
            fc.parentName != null ? fc.parentName : prev.parentName,
          notificationPrefs: fc.notificationPrefs != null ? fc.notificationPrefs : prev.notificationPrefs,
        });
      });
    });

    // --- Children listener ---
    var unsubChildren = onChildrenSnapshot(familyId, function (list) {
      if (dead) return;
      setCfg(function (prev) {
        if (!prev) return prev;
        return Object.assign({}, prev, {
          children: list as Child[],
        });
      });
      // Sync per-child data listeners
      syncChildDataListeners(list.map(function (c) { return c.id; }));
    });

    // --- Tasks listener ---
    var unsubTasks = onTasksSnapshot(familyId, function (list) {
      if (dead) return;
      var tasksMap: Record<string, Task[]> = {};
      list.forEach(function (t: any) {
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
      setCfg(function (prev) {
        if (!prev) return prev;
        return Object.assign({}, prev, { tasks: tasksMap });
      });
    });

    // --- Rewards listener ---
    var unsubRewards = onRewardsSnapshot(familyId, function (list) {
      if (dead) return;
      setCfg(function (prev) {
        if (!prev) return prev;
        return Object.assign({}, prev, {
          rewards: list as Reward[],
        });
      });
    });

    // --- Per-child data listeners ---
    function attachChildDataListener(childId: string) {
      if (childUnsubsRef.current[childId]) return; // already listening
      childUnsubsRef.current[childId] = onChildDataSnapshot(
        familyId,
        childId,
        function (data) {
          if (dead) return;
          setAllU(function (prev) {
            if (!data) {
              var next = Object.assign({}, prev);
              delete next[childId];
              return next;
            }
            return Object.assign({}, prev, { [childId]: data as UserData });
          });
        }
      );
    }

    function syncChildDataListeners(childIds: string[]) {
      var idSet: Record<string, boolean> = {};
      childIds.forEach(function (id) {
        idSet[id] = true;
        attachChildDataListener(id);
      });
      // Remove listeners and stale data for children that no longer exist
      Object.keys(childUnsubsRef.current).forEach(function (id) {
        if (!idSet[id]) {
          childUnsubsRef.current[id]();
          delete childUnsubsRef.current[id];
          setAllU(function (prev) {
            var next = Object.assign({}, prev);
            delete next[id];
            return next;
          });
        }
      });
    }

    // Attach childData listeners for current children
    setCfg(function (prev) {
      if (prev && prev.children) {
        syncChildDataListeners(
          prev.children.map(function (c) { return c.id; })
        );
      }
      return prev; // no mutation — just reading
    });

    return function () {
      dead = true;
      unsubConfig();
      unsubChildren();
      unsubTasks();
      unsubRewards();
      // Clean up all child data listeners
      Object.keys(childUnsubsRef.current).forEach(function (id) {
        childUnsubsRef.current[id]();
      });
      childUnsubsRef.current = {};
    };
  }, [familyId, loading]);
}
