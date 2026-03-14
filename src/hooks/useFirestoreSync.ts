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
  // Track whether we've received the first snapshot for each collection
  // to skip the initial echo (we already loaded that data)
  var initialSkipRef = useRef({
    config: true,
    children: true,
    tasks: true,
    rewards: true,
  });

  useEffect(function () {
    if (!familyId || loading) return;

    var dead = false;

    // --- Config listener ---
    var unsubConfig = onConfigSnapshot(familyId, function (fc) {
      if (dead) return;
      if (initialSkipRef.current.config) {
        initialSkipRef.current.config = false;
        return;
      }
      setCfg(function (prev) {
        if (!prev) return prev;
        return Object.assign({}, prev, {
          parentPin: fc ? fc.parentPin : prev.parentPin,
          tierConfig: fc && fc.tierConfig ? fc.tierConfig : prev.tierConfig,
          approvalThreshold:
            fc && fc.approvalThreshold != null
              ? fc.approvalThreshold
              : prev.approvalThreshold,
          lastWeeklyReset: fc ? fc.lastWeeklyReset || '' : prev.lastWeeklyReset,
          bedtime:
            fc && (fc as any).bedtime != null
              ? (fc as any).bedtime
              : prev.bedtime,
          weeklyResetDay:
            fc && (fc as any).weeklyResetDay != null
              ? (fc as any).weeklyResetDay
              : prev.weeklyResetDay,
          cooldown:
            fc && (fc as any).cooldown != null
              ? (fc as any).cooldown
              : prev.cooldown,
          familyCode:
            fc && (fc as any).familyCode
              ? (fc as any).familyCode
              : prev.familyCode,
        });
      });
    });

    // --- Children listener ---
    var unsubChildren = onChildrenSnapshot(familyId, function (list) {
      if (dead) return;
      if (initialSkipRef.current.children) {
        initialSkipRef.current.children = false;
        return;
      }
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
      if (initialSkipRef.current.tasks) {
        initialSkipRef.current.tasks = false;
        return;
      }
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
      if (initialSkipRef.current.rewards) {
        initialSkipRef.current.rewards = false;
        return;
      }
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
      var firstSnap = true;
      childUnsubsRef.current[childId] = onChildDataSnapshot(
        familyId,
        childId,
        function (data) {
          if (dead) return;
          if (firstSnap) {
            firstSnap = false;
            return;
          }
          if (!data) return;
          setAllU(function (prev) {
            var next: Record<string, UserData> = {};
            for (var k in prev) next[k] = prev[k];
            next[childId] = data as UserData;
            return next;
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
      // Remove listeners for children that no longer exist
      Object.keys(childUnsubsRef.current).forEach(function (id) {
        if (!idSet[id]) {
          childUnsubsRef.current[id]();
          delete childUnsubsRef.current[id];
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
      // Reset skip flags for potential re-mount
      initialSkipRef.current = {
        config: true,
        children: true,
        tasks: true,
        rewards: true,
      };
    };
  }, [familyId, loading]);
}
