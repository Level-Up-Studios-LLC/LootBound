import { useCallback } from 'react';
import * as Sentry from '@sentry/react';
import { doc, collection } from 'firebase/firestore';
import { db } from '../services/firebase.ts';
import { saveCoopRequest } from '../services/firestoreStorage.ts';
import { getToday } from '../utils.ts';
import type {
  Child,
  Task,
  CoopRequest,
  CoopStatus,
  TierConfig,
} from '../types.ts';

interface UseCoopActionsParams {
  familyId: string;
  children: Child[];
  tasks: Record<string, Task[]>;
  coopRequests: CoopRequest[];
  tierConfig: Record<string, TierConfig>;
  sendNotification: (data: {
    type: string;
    title: string;
    body: string;
    childId?: string;
    childName?: string;
    targetRole: 'parent' | 'kid';
  }) => Promise<void>;
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
        if (initiatorId === partnerId) throw new Error('Cannot co-op with yourself');

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
          throw new Error('Partner already has an active co-op for this task today');
        }

        // Generate a Firestore auto-ID by creating a ref on the collection
        const ref = doc(
          collection(db, 'families', familyId, 'coopRequests')
        );
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
        }).catch(e => Sentry.captureException(e, { level: 'warning', tags: { action: 'coop-notification' } }));

        // Notify parent (fire-and-forget)
        sendNotification({
          type: 'coop_request',
          title: 'Co-op Request',
          body: `${initiatorName} invited ${partnerName} to co-op on ${task.name}`,
          targetRole: 'parent',
        }).catch(e => Sentry.captureException(e, { level: 'warning', tags: { action: 'coop-notification' } }));
      } catch (err) {
        Sentry.captureException(err, {
          tags: { action: 'coop-request' },
        });
        throw err;
      }
    },
    [
      familyId,
      children,
      tasks,
      isTaskInActiveCoop,
      sendNotification,
    ]
  );

  // -------------------------------------------------------------------------
  // acceptCoop
  // -------------------------------------------------------------------------

  const acceptCoop = useCallback(
    async (requestId: string): Promise<void> => {
      try {
        const req = findRequest(requestId);
        if (!req) throw new Error('Co-op request not found');
        if (req.status !== 'pending_partner') throw new Error('Request is no longer pending partner response');

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
        }).catch(e => Sentry.captureException(e, { level: 'warning', tags: { action: 'coop-notification' } }));

        sendNotification({
          type: 'coop_accepted',
          title: 'Co-op Needs Approval',
          body: `${initiatorName} & ${partnerName} want to co-op on ${req.taskName}`,
          targetRole: 'parent',
        }).catch(e => Sentry.captureException(e, { level: 'warning', tags: { action: 'coop-notification' } }));
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
        if (req.status !== 'pending_partner') throw new Error('Request is no longer pending partner response');

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
        }).catch(e => Sentry.captureException(e, { level: 'warning', tags: { action: 'coop-notification' } }));
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
        if (req.status !== 'pending_parent') throw new Error('Request is not pending parent approval');

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
        }).catch(e => Sentry.captureException(e, { level: 'warning', tags: { action: 'coop-notification' } }));

        sendNotification({
          type: 'coop_approved',
          title: 'Co-op Approved',
          body: `Your co-op on ${req.taskName} with ${initiatorName} is approved!`,
          childId: req.partnerId,
          childName: partnerName,
          targetRole: 'kid',
        }).catch(e => Sentry.captureException(e, { level: 'warning', tags: { action: 'coop-notification' } }));
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
        if (req.status !== 'pending_parent') throw new Error('Request is not pending parent approval');

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
        }).catch(e => Sentry.captureException(e, { level: 'warning', tags: { action: 'coop-notification' } }));

        sendNotification({
          type: 'coop_denied',
          title: 'Co-op Denied',
          body: `The co-op on ${req.taskName} was not approved`,
          childId: req.partnerId,
          childName: partnerName,
          targetRole: 'kid',
        }).catch(e => Sentry.captureException(e, { level: 'warning', tags: { action: 'coop-notification' } }));
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
        if (!ACTIVE_STATUSES.includes(req.status)) throw new Error('Request is no longer active');

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
        }).catch(e => Sentry.captureException(e, { level: 'warning', tags: { action: 'coop-notification' } }));

        sendNotification({
          type: 'coop_cancelled',
          title: 'Co-op Cancelled',
          body: `The co-op on ${req.taskName} was cancelled`,
          childId: req.partnerId,
          childName: partnerName,
          targetRole: 'kid',
        }).catch(e => Sentry.captureException(e, { level: 'warning', tags: { action: 'coop-notification' } }));
      } catch (err) {
        Sentry.captureException(err, {
          tags: { action: 'coop-cancel' },
        });
        throw err;
      }
    },
    [familyId, coopRequests, children, sendNotification]
  );

  return {
    requestCoop,
    acceptCoop,
    declineCoop,
    approveCoop,
    denyCoop,
    cancelCoop,
    isTaskInActiveCoop,
  };
}
