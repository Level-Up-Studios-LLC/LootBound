import { useCallback } from 'react';
import * as Sentry from '@sentry/react';
import { doc, collection } from 'firebase/firestore';
import { db } from '../services/firebase.ts';
import { saveCoopRequest } from '../services/firestoreStorage.ts';
import {
  freshUser,
  getToday,
  nowMin,
  nowSec,
  timeToMin,
  calcPts,
  getStreakMultiplier,
  getLevelFromXp,
  getLevelCoinBonus,
  getLevelTitle,
  prevDate,
  isTaskActiveToday,
} from '../utils.ts';
import { uploadTaskPhoto } from '../services/photoStorage.ts';
import { triggerHaptic } from '../services/platform.ts';
import type {
  Child,
  Task,
  TierConfig,
  UserData,
  Config,
  CoopRequest,
  CoopStatus,
  TaskLogEntry,
} from '../types.ts';
import type { SoundKey } from '../services/notificationSound.ts';

interface UseCoopActionsParams {
  familyId: string;
  children: Child[];
  tasks: Record<string, Task[]>;
  coopRequests: CoopRequest[];
  sendNotification: (data: {
    type: string;
    title: string;
    body: string;
    childId?: string;
    childName?: string;
    targetRole: 'parent' | 'kid';
  }) => Promise<void>;
  // Phase 5 deps (optional — only needed once completion logic is wired)
  allU?: Record<string, UserData>;
  cfg?: Config | null;
  saveUsr?: (uid: string, data: UserData) => Promise<void>;
  tierCfg?: (tier: string) => TierConfig;
  notify?: (msg: string, type?: string) => void;
  playSound?: (key: SoundKey) => void;
}

/** Statuses that represent an active (unresolved) co-op for conflict checks. */
const ACTIVE_STATUSES: CoopStatus[] = [
  'pending_partner',
  'pending_parent',
  'approved',
];

export function useCoopActions(params: UseCoopActionsParams) {
  const {
    familyId,
    children,
    tasks,
    coopRequests,
    sendNotification,
    allU,
    cfg,
    saveUsr,
    tierCfg,
    notify,
    playSound,
  } = params;

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const getChildName = (childId: string): string => {
    const child = children.find(c => c.id === childId);
    return child ? child.name : childId;
  };

  const findRequest = (requestId: string): CoopRequest | undefined => {
    return coopRequests.find(r => r.id === requestId);
  };

  // -------------------------------------------------------------------------
  // isTaskInActiveCoop
  // -------------------------------------------------------------------------

  const isTaskInActiveCoop = useCallback(
    (childId: string, taskId: string, date: string): boolean => {
      return coopRequests.some(
        r =>
          r.taskId === taskId &&
          r.date === date &&
          (r.initiatorId === childId || r.partnerId === childId) &&
          ACTIVE_STATUSES.includes(r.status)
      );
    },
    [coopRequests]
  );

  // -------------------------------------------------------------------------
  // requestCoop
  // -------------------------------------------------------------------------

  const requestCoop = useCallback(
    async (
      initiatorId: string,
      taskId: string,
      partnerId: string
    ): Promise<void> => {
      try {
        // Validate no self-co-op
        if (initiatorId === partnerId)
          throw new Error('Cannot co-op with yourself');

        // Validate partner exists
        const partner = children.find(c => c.id === partnerId);
        if (!partner) throw new Error('Invalid partner');

        // Validate task exists for the initiator
        const childTasks = tasks[initiatorId] || [];
        const task = childTasks.find(t => t.id === taskId);
        if (!task) throw new Error('Task not found');

        // Check no active co-op for this task today (either kid)
        const today = getToday();
        if (isTaskInActiveCoop(initiatorId, taskId, today)) {
          throw new Error('An active co-op already exists for this task today');
        }
        if (isTaskInActiveCoop(partnerId, taskId, today)) {
          throw new Error(
            'Partner already has an active co-op for this task today'
          );
        }

        // Generate a Firestore auto-ID by creating a ref on the collection
        const ref = doc(collection(db, 'families', familyId, 'coopRequests'));
        const requestId = ref.id;

        const initiatorName = getChildName(initiatorId);
        const partnerName = partner.name;

        const newRequest: Omit<CoopRequest, 'id'> = {
          taskId,
          initiatorId,
          partnerId,
          status: 'pending_partner',
          date: today,
          createdAt: Date.now(),
          partnerRespondedAt: null,
          parentResolvedAt: null,
          completedAt: null,
          windowStartOverride: null,
          windowEndOverride: null,
          coinOverride: null,
          initiatorCompleted: false,
          partnerCompleted: false,
          taskName: task.name,
          taskTier: task.tier,
          initiatorName,
          partnerName,
        };

        await saveCoopRequest(familyId, requestId, newRequest);

        // Notify partner kid (fire-and-forget)
        sendNotification({
          type: 'coop_request',
          title: 'Co-op Request',
          body: `${initiatorName} wants to team up on ${task.name}!`,
          childId: partnerId,
          childName: partnerName,
          targetRole: 'kid',
        }).catch(e =>
          Sentry.captureException(e, {
            level: 'warning',
            tags: { action: 'coop-notification' },
          })
        );

        // Notify parent (fire-and-forget)
        sendNotification({
          type: 'coop_request',
          title: 'Co-op Request',
          body: `${initiatorName} invited ${partnerName} to co-op on ${task.name}`,
          targetRole: 'parent',
        }).catch(e =>
          Sentry.captureException(e, {
            level: 'warning',
            tags: { action: 'coop-notification' },
          })
        );
      } catch (err) {
        Sentry.captureException(err, {
          tags: { action: 'coop-request' },
        });
        throw err;
      }
    },
    [familyId, children, tasks, isTaskInActiveCoop, sendNotification]
  );

  // -------------------------------------------------------------------------
  // acceptCoop
  // -------------------------------------------------------------------------

  const acceptCoop = useCallback(
    async (requestId: string): Promise<void> => {
      try {
        const req = findRequest(requestId);
        if (!req) throw new Error('Co-op request not found');
        if (req.status !== 'pending_partner')
          throw new Error('Request is no longer pending partner response');

        await saveCoopRequest(familyId, requestId, {
          status: 'pending_parent',
          partnerRespondedAt: Date.now(),
        });

        const initiatorName = getChildName(req.initiatorId);
        const partnerName = getChildName(req.partnerId);

        sendNotification({
          type: 'coop_accepted',
          title: 'Co-op Accepted',
          body: `${partnerName} accepted your co-op on ${req.taskName}!`,
          childId: req.initiatorId,
          childName: initiatorName,
          targetRole: 'kid',
        }).catch(e =>
          Sentry.captureException(e, {
            level: 'warning',
            tags: { action: 'coop-notification' },
          })
        );

        sendNotification({
          type: 'coop_accepted',
          title: 'Co-op Needs Approval',
          body: `${initiatorName} & ${partnerName} want to co-op on ${req.taskName}`,
          targetRole: 'parent',
        }).catch(e =>
          Sentry.captureException(e, {
            level: 'warning',
            tags: { action: 'coop-notification' },
          })
        );
      } catch (err) {
        Sentry.captureException(err, {
          tags: { action: 'coop-accept' },
        });
        throw err;
      }
    },
    [familyId, coopRequests, children, sendNotification]
  );

  // -------------------------------------------------------------------------
  // declineCoop
  // -------------------------------------------------------------------------

  const declineCoop = useCallback(
    async (requestId: string): Promise<void> => {
      try {
        const req = findRequest(requestId);
        if (!req) throw new Error('Co-op request not found');
        if (req.status !== 'pending_partner')
          throw new Error('Request is no longer pending partner response');

        await saveCoopRequest(familyId, requestId, {
          status: 'declined',
          partnerRespondedAt: Date.now(),
        });

        const partnerName = getChildName(req.partnerId);
        const initiatorName = getChildName(req.initiatorId);

        sendNotification({
          type: 'coop_declined',
          title: 'Co-op Declined',
          body: `${partnerName} declined the co-op on ${req.taskName}`,
          childId: req.initiatorId,
          childName: initiatorName,
          targetRole: 'kid',
        }).catch(e =>
          Sentry.captureException(e, {
            level: 'warning',
            tags: { action: 'coop-notification' },
          })
        );
      } catch (err) {
        Sentry.captureException(err, {
          tags: { action: 'coop-decline' },
        });
        throw err;
      }
    },
    [familyId, coopRequests, children, sendNotification]
  );

  // -------------------------------------------------------------------------
  // approveCoop
  // -------------------------------------------------------------------------

  const approveCoop = useCallback(
    async (
      requestId: string,
      overrides?: {
        windowStart?: string;
        windowEnd?: string;
        coinOverride?: number;
      }
    ): Promise<void> => {
      try {
        const req = findRequest(requestId);
        if (!req) throw new Error('Co-op request not found');
        if (req.status !== 'pending_parent')
          throw new Error('Request is not pending parent approval');

        const updates: Partial<Omit<CoopRequest, 'id'>> = {
          status: 'approved',
          parentResolvedAt: Date.now(),
        };

        if (overrides?.windowStart != null) {
          updates.windowStartOverride = overrides.windowStart;
        }
        if (overrides?.windowEnd != null) {
          updates.windowEndOverride = overrides.windowEnd;
        }
        if (overrides?.coinOverride != null) {
          updates.coinOverride = overrides.coinOverride;
        }

        await saveCoopRequest(familyId, requestId, updates);

        const initiatorName = getChildName(req.initiatorId);
        const partnerName = getChildName(req.partnerId);

        sendNotification({
          type: 'coop_approved',
          title: 'Co-op Approved',
          body: `Your co-op on ${req.taskName} with ${partnerName} is approved!`,
          childId: req.initiatorId,
          childName: initiatorName,
          targetRole: 'kid',
        }).catch(e =>
          Sentry.captureException(e, {
            level: 'warning',
            tags: { action: 'coop-notification' },
          })
        );

        sendNotification({
          type: 'coop_approved',
          title: 'Co-op Approved',
          body: `Your co-op on ${req.taskName} with ${initiatorName} is approved!`,
          childId: req.partnerId,
          childName: partnerName,
          targetRole: 'kid',
        }).catch(e =>
          Sentry.captureException(e, {
            level: 'warning',
            tags: { action: 'coop-notification' },
          })
        );
      } catch (err) {
        Sentry.captureException(err, {
          tags: { action: 'coop-approve' },
        });
        throw err;
      }
    },
    [familyId, coopRequests, children, sendNotification]
  );

  // -------------------------------------------------------------------------
  // denyCoop
  // -------------------------------------------------------------------------

  const denyCoop = useCallback(
    async (requestId: string): Promise<void> => {
      try {
        const req = findRequest(requestId);
        if (!req) throw new Error('Co-op request not found');
        if (req.status !== 'pending_parent')
          throw new Error('Request is not pending parent approval');

        await saveCoopRequest(familyId, requestId, {
          status: 'denied',
          parentResolvedAt: Date.now(),
        });

        const initiatorName = getChildName(req.initiatorId);
        const partnerName = getChildName(req.partnerId);

        sendNotification({
          type: 'coop_denied',
          title: 'Co-op Denied',
          body: `Your co-op on ${req.taskName} was not approved`,
          childId: req.initiatorId,
          childName: initiatorName,
          targetRole: 'kid',
        }).catch(e =>
          Sentry.captureException(e, {
            level: 'warning',
            tags: { action: 'coop-notification' },
          })
        );

        sendNotification({
          type: 'coop_denied',
          title: 'Co-op Denied',
          body: `The co-op on ${req.taskName} was not approved`,
          childId: req.partnerId,
          childName: partnerName,
          targetRole: 'kid',
        }).catch(e =>
          Sentry.captureException(e, {
            level: 'warning',
            tags: { action: 'coop-notification' },
          })
        );
      } catch (err) {
        Sentry.captureException(err, {
          tags: { action: 'coop-deny' },
        });
        throw err;
      }
    },
    [familyId, coopRequests, children, sendNotification]
  );

  // -------------------------------------------------------------------------
  // cancelCoop
  // -------------------------------------------------------------------------

  const cancelCoop = useCallback(
    async (requestId: string): Promise<void> => {
      try {
        const req = findRequest(requestId);
        if (!req) throw new Error('Co-op request not found');
        if (!ACTIVE_STATUSES.includes(req.status))
          throw new Error('Request is no longer active');

        await saveCoopRequest(familyId, requestId, {
          status: 'cancelled',
        });

        const initiatorName = getChildName(req.initiatorId);
        const partnerName = getChildName(req.partnerId);

        sendNotification({
          type: 'coop_cancelled',
          title: 'Co-op Cancelled',
          body: `The co-op on ${req.taskName} was cancelled`,
          childId: req.initiatorId,
          childName: initiatorName,
          targetRole: 'kid',
        }).catch(e =>
          Sentry.captureException(e, {
            level: 'warning',
            tags: { action: 'coop-notification' },
          })
        );

        sendNotification({
          type: 'coop_cancelled',
          title: 'Co-op Cancelled',
          body: `The co-op on ${req.taskName} was cancelled`,
          childId: req.partnerId,
          childName: partnerName,
          targetRole: 'kid',
        }).catch(e =>
          Sentry.captureException(e, {
            level: 'warning',
            tags: { action: 'coop-notification' },
          })
        );
      } catch (err) {
        Sentry.captureException(err, {
          tags: { action: 'coop-cancel' },
        });
        throw err;
      }
    },
    [familyId, coopRequests, children, sendNotification]
  );

  // -------------------------------------------------------------------------
  // awardCoopRewards — grant held rewards when both kids have completed
  // -------------------------------------------------------------------------

  const awardCoopRewards = useCallback(
    async (
      req: CoopRequest,
      overrideUserData?: Record<string, UserData>
    ): Promise<void> => {
      if (!allU || !cfg || !saveUsr || !tierCfg || !notify || !playSound) {
        console.warn('awardCoopRewards: missing required deps, skipping');
        return;
      }
      // Idempotency: skip if already completed
      if (req.status === 'completed') return;

      try {
        const tc = tierCfg(req.taskTier);
        const baseCoinValue = req.coinOverride ?? tc.coins;
        const d = req.date;

        // Process each kid
        const kids = [
          {
            id: req.initiatorId,
            role: 'initiator' as const,
            logKey: req.taskId,
          },
          {
            id: req.partnerId,
            role: 'partner' as const,
            logKey: `coop:${req.id}`,
          },
        ];

        let allKidsProcessed = true;
        for (const kid of kids) {
          const ud = structuredClone(
            overrideUserData?.[kid.id] ?? allU[kid.id] ?? freshUser()
          ) as UserData;
          if (!ud.taskLog) ud.taskLog = {};
          if (!ud.taskLog[d]) ud.taskLog[d] = {};
          const entry = ud.taskLog[d][kid.logKey] as TaskLogEntry | undefined;
          if (!entry) {
            console.warn(
              `awardCoopRewards: no taskLog entry for ${kid.id}/${kid.logKey}`
            );
            Sentry.captureMessage(
              'Co-op reward skipped: missing taskLog entry',
              {
                level: 'warning',
                tags: {
                  action: 'coop-award',
                  kidId: kid.id,
                  logKey: kid.logKey,
                },
              }
            );
            allKidsProcessed = false;
            continue;
          }

          // Persisted idempotency: skip if rewards already awarded for this kid
          if (entry.coopPartnerCompleted) continue;

          // Calculate rewards using the kid's individual completion status
          const rawCoins = Math.floor(calcPts(baseCoinValue, entry.status) / 2);
          const lvlBonus = getLevelCoinBonus(ud.level || 1);
          const coins =
            lvlBonus > 0
              ? Math.round(rawCoins * (1 + lvlBonus / 100))
              : rawCoins;

          const rawXp = calcPts(tc.xp, entry.status);
          const streakMult = getStreakMultiplier(ud.streak || 0);
          const xp = Math.round(rawXp * streakMult);

          // Update taskLog entry with actual rewards
          entry.points = coins;
          entry.xp = xp;
          entry.coopPartnerCompleted = true;

          // Update user totals
          ud.points = (ud.points || 0) + coins;
          ud.xp = (ud.xp || 0) + xp;
          const oldLevel = ud.level || 1;
          ud.level = getLevelFromXp(ud.xp);

          // Check allDone for streak (solo + virtual co-op tasks for this kid)
          const soloActive = (cfg.tasks[kid.id] || []).filter(
            isTaskActiveToday
          );
          const virtualCoopIds = coopRequests
            .filter(
              r =>
                r.partnerId === kid.id &&
                r.date === d &&
                (r.status === 'approved' ||
                  (r.status === 'completed' && r.id !== req.id) ||
                  r.id === req.id)
            ) // include the current one being completed
            .map(r => `coop:${r.id}`);

          const allTaskIds = [...soloActive.map(t => t.id), ...virtualCoopIds];
          const allDone = allTaskIds.every(tid => {
            const l =
              ud.taskLog[d] && (ud.taskLog[d][tid] as TaskLogEntry | undefined);
            if (!l || l.rejected || l.status === 'missed') return false;
            if (l.coopRequestId && !l.coopPartnerCompleted) return false;
            return true;
          });
          const noneMissed = allTaskIds.every(tid => {
            const l =
              ud.taskLog[d] && (ud.taskLog[d][tid] as TaskLogEntry | undefined);
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
            // Streak milestone bonuses (same as solo path)
            // Use sendNotification instead of local notify/playSound since
            // awardCoopRewards can run on a different device or parent session
            const kidName = getChildName(kid.id);
            if (ud.streak === 3) {
              ud.points += 20;
              sendNotification({
                type: 'streak',
                title: 'Streak Milestone!',
                body: `${kidName} hit a 3-day streak! +20 coins`,
                childId: kid.id,
                childName: kidName,
                targetRole: 'kid',
              }).catch(e =>
                Sentry.captureException(e, {
                  level: 'warning',
                  tags: { action: 'coop-notification' },
                })
              );
            } else if (ud.streak === 7) {
              ud.points += 75;
              sendNotification({
                type: 'streak',
                title: 'Streak Milestone!',
                body: `${kidName} hit a 7-day streak! +75 coins`,
                childId: kid.id,
                childName: kidName,
                targetRole: 'kid',
              }).catch(e =>
                Sentry.captureException(e, {
                  level: 'warning',
                  tags: { action: 'coop-notification' },
                })
              );
            } else if (ud.streak === 15) {
              ud.points += 150;
              sendNotification({
                type: 'streak',
                title: 'Streak Milestone!',
                body: `${kidName} hit a 15-day streak! +150 coins`,
                childId: kid.id,
                childName: kidName,
                targetRole: 'kid',
              }).catch(e =>
                Sentry.captureException(e, {
                  level: 'warning',
                  tags: { action: 'coop-notification' },
                })
              );
            } else if (ud.streak === 30) {
              ud.points += 300;
              sendNotification({
                type: 'streak',
                title: 'Streak Milestone!',
                body: `${kidName} hit a 30-day streak! +300 coins`,
                childId: kid.id,
                childName: kidName,
                targetRole: 'kid',
              }).catch(e =>
                Sentry.captureException(e, {
                  level: 'warning',
                  tags: { action: 'coop-notification' },
                })
              );
            }
          }

          await saveUsr(kid.id, ud);

          // Level up notification
          if (ud.level > oldLevel) {
            const title = getLevelTitle(ud.level);
            const kidName = getChildName(kid.id);
            sendNotification({
              type: 'level_up',
              title: 'Level Up!',
              body: `${kidName} reached Lv.${ud.level} ${title.title}!`,
              childId: kid.id,
              childName: kidName,
              targetRole: 'parent',
            }).catch(e =>
              Sentry.captureException(e, {
                level: 'warning',
                tags: { action: 'coop-notification' },
              })
            );
          }
        }

        // Only mark completed if both kids were successfully processed
        if (!allKidsProcessed) return;

        await saveCoopRequest(familyId, req.id, {
          status: 'completed',
          completedAt: Date.now(),
        });

        // Notify both kids + parent
        const initiatorName = getChildName(req.initiatorId);
        const partnerName = getChildName(req.partnerId);
        sendNotification({
          type: 'coop_complete',
          title: 'Co-op Complete!',
          body: `${req.taskName} co-op with ${partnerName} is done! Coins split.`,
          childId: req.initiatorId,
          childName: initiatorName,
          targetRole: 'kid',
        }).catch(e =>
          Sentry.captureException(e, {
            level: 'warning',
            tags: { action: 'coop-notification' },
          })
        );
        sendNotification({
          type: 'coop_complete',
          title: 'Co-op Complete!',
          body: `${req.taskName} co-op with ${initiatorName} is done! Coins split.`,
          childId: req.partnerId,
          childName: partnerName,
          targetRole: 'kid',
        }).catch(e =>
          Sentry.captureException(e, {
            level: 'warning',
            tags: { action: 'coop-notification' },
          })
        );
        sendNotification({
          type: 'coop_complete',
          title: 'Co-op Complete!',
          body: `${initiatorName} & ${partnerName} finished ${req.taskName} together`,
          targetRole: 'parent',
        }).catch(e =>
          Sentry.captureException(e, {
            level: 'warning',
            tags: { action: 'coop-notification' },
          })
        );
      } catch (err) {
        Sentry.captureException(err, {
          tags: { action: 'coop-award' },
        });
        throw err;
      }
    },
    [
      familyId,
      allU,
      cfg,
      tasks,
      coopRequests,
      children,
      saveUsr,
      tierCfg,
      notify,
      playSound,
      sendNotification,
    ]
  );

  // -------------------------------------------------------------------------
  // completeCoopTask — individual kid marks their part as done
  // -------------------------------------------------------------------------

  const completeCoopTask = useCallback(
    async (
      childId: string,
      _taskId: string,
      coopReq: CoopRequest,
      photo: string | null
    ): Promise<void> => {
      if (!allU || !cfg || !saveUsr || !tierCfg || !notify || !playSound)
        return;

      try {
        const isInitiator = coopReq.initiatorId === childId;
        const logKey = isInitiator ? coopReq.taskId : `coop:${coopReq.id}`;
        const d = coopReq.date;

        // Find the original task for window times
        const initiatorTasks = tasks[coopReq.initiatorId] || [];
        const originalTask = initiatorTasks.find(t => t.id === coopReq.taskId);
        const wStart =
          coopReq.windowStartOverride ?? originalTask?.windowStart ?? '08:00';
        const wEnd =
          coopReq.windowEndOverride ?? originalTask?.windowEnd ?? '20:00';

        // Determine status based on completion time vs window
        const now = nowMin();
        const bedtime = cfg.bedtime != null ? cfg.bedtime : 21 * 60;
        let status: string;
        if (now < timeToMin(wStart)) status = 'early';
        else if (now <= Math.min(timeToMin(wEnd), bedtime)) status = 'ontime';
        else status = 'late';

        // Upload photo
        let photoUrl: string | null = null;
        if (photo) {
          try {
            photoUrl = await uploadTaskPhoto(
              familyId,
              childId,
              d,
              logKey,
              photo
            );
          } catch (err) {
            console.warn('Co-op photo upload failed, storing locally:', err);
            Sentry.captureException(err, {
              tags: { action: 'coop-photo-upload' },
            });
            photoUrl = photo;
          }
        }

        // Write held taskLog entry (points/xp = 0 until both complete)
        const ud = structuredClone(allU[childId] || freshUser()) as UserData;
        if (!ud.taskLog) ud.taskLog = {};
        if (!ud.taskLog[d]) ud.taskLog[d] = {};

        ud.taskLog[d][logKey] = {
          completedAt: now,
          status,
          points: 0,
          xp: 0,
          photo: photoUrl,
          rejected: false,
          coopRequestId: coopReq.id,
          coopRole: isInitiator ? 'initiator' : 'partner',
          coopPartnerId: isInitiator ? coopReq.partnerId : coopReq.initiatorId,
        };
        ud.lastTaskTime = nowSec();
        await saveUsr(childId, ud);

        // Update co-op request flag
        await saveCoopRequest(familyId, coopReq.id, {
          [isInitiator ? 'initiatorCompleted' : 'partnerCompleted']: true,
        });

        // Check if both completed
        const otherDone = isInitiator
          ? coopReq.partnerCompleted
          : coopReq.initiatorCompleted;

        if (otherDone) {
          // Both done — award rewards
          // Re-read the coopReq with updated flags for awardCoopRewards
          const updatedReq: CoopRequest = {
            ...coopReq,
            initiatorCompleted: isInitiator ? true : coopReq.initiatorCompleted,
            partnerCompleted: isInitiator ? coopReq.partnerCompleted : true,
          };
          await awardCoopRewards(updatedReq, { [childId]: ud });
          triggerHaptic('success');
          playSound('success');
          notify('Co-op complete! Coins split.');
        } else {
          // Only this kid is done — notify the other
          const kidName = getChildName(childId);
          const otherKidId = isInitiator
            ? coopReq.partnerId
            : coopReq.initiatorId;
          const otherKidName = getChildName(otherKidId);
          sendNotification({
            type: 'coop_partner_done',
            title: 'Partner Done!',
            body: `${kidName} finished their part of ${coopReq.taskName}! Your turn!`,
            childId: otherKidId,
            childName: otherKidName,
            targetRole: 'kid',
          }).catch(e =>
            Sentry.captureException(e, {
              level: 'warning',
              tags: { action: 'coop-notification' },
            })
          );
          triggerHaptic('success');
          playSound('success');
          notify(`Done! Waiting for ${otherKidName}...`);
        }
      } catch (err) {
        Sentry.captureException(err, {
          tags: { action: 'coop-complete' },
        });
        throw err;
      }
    },
    [
      familyId,
      allU,
      cfg,
      tasks,
      saveUsr,
      tierCfg,
      notify,
      playSound,
      sendNotification,
      awardCoopRewards,
      children,
    ]
  );

  return {
    requestCoop,
    acceptCoop,
    declineCoop,
    approveCoop,
    denyCoop,
    cancelCoop,
    isTaskInActiveCoop,
    completeCoopTask,
    awardCoopRewards,
  };
}
