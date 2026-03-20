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
  const { familyId, loading, setCfg, setAllU } = deps;

  // Track child IDs so we can add/remove per-child listeners dynamically
  const childUnsubsRef = useRef<Record<string, () => void>>({});

  useEffect(() => {
    if (!familyId || loading) return;

    let dead = false;

    // --- Config listener ---
    const unsubConfig = onConfigSnapshot(familyId, (fc) => {
      if (dead) return;
      setCfg((prev) => {
        if (!prev || !fc) return prev;
        return {
          ...prev,
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
        };
      });
    });

    // --- Children listener ---
    const unsubChildren = onChildrenSnapshot(familyId, (list) => {
      if (dead) return;
      setCfg((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          children: list as Child[],
        };
      });
      // Sync per-child data listeners
      syncChildDataListeners(list.map((c) => c.id));
    });

    // --- Tasks listener ---
    const unsubTasks = onTasksSnapshot(familyId, (list) => {
      if (dead) return;
      const tasksMap: Record<string, Task[]> = {};
      list.forEach((t) => {
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
      setCfg((prev) => {
        if (!prev) return prev;
        return { ...prev, tasks: tasksMap };
      });
    });

    // --- Rewards listener ---
    const unsubRewards = onRewardsSnapshot(familyId, (list) => {
      if (dead) return;
      setCfg((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          rewards: list as Reward[],
        };
      });
    });

    // --- Per-child data listeners ---
    const attachChildDataListener = (childId: string) => {
      if (childUnsubsRef.current[childId]) return; // already listening
      childUnsubsRef.current[childId] = onChildDataSnapshot(
        familyId,
        childId,
        (data) => {
          if (dead) return;
          setAllU((prev) => {
            if (!data) {
              const next = { ...prev };
              delete next[childId];
              return next;
            }
            return { ...prev, [childId]: data as UserData };
          });
        }
      );
    };

    const syncChildDataListeners = (childIds: string[]) => {
      const idSet: Record<string, boolean> = {};
      childIds.forEach((id) => {
        idSet[id] = true;
        attachChildDataListener(id);
      });
      // Remove listeners and stale data for children that no longer exist
      Object.keys(childUnsubsRef.current).forEach((id) => {
        if (!idSet[id]) {
          childUnsubsRef.current[id]();
          delete childUnsubsRef.current[id];
          setAllU((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }
      });
    };

    // Attach childData listeners for current children
    setCfg((prev) => {
      if (prev && prev.children) {
        syncChildDataListeners(
          prev.children.map((c) => c.id)
        );
      }
      return prev; // no mutation — just reading
    });

    return () => {
      dead = true;
      unsubConfig();
      unsubChildren();
      unsubTasks();
      unsubRewards();
      // Clean up all child data listeners
      Object.keys(childUnsubsRef.current).forEach((id) => {
        childUnsubsRef.current[id]();
      });
      childUnsubsRef.current = {};
    };
  }, [familyId, loading]);
}
