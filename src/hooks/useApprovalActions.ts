import * as Sentry from '@sentry/react';
import type { UserData } from '../types.ts';
import { freshUser, getToday } from '../utils.ts';
import { writeNotification } from '../services/firestoreStorage.ts';
import { triggerHaptic } from '../services/platform.ts';
import type { SoundKey } from '../services/notificationSound.ts';

interface ApprovalActionsDeps {
  allU: Record<string, UserData>;
  familyId: string;
  saveUsr: (uid: string, data: UserData) => Promise<void>;
  notify: (msg: string, type?: string) => void;
  getChildName?: (id: string) => string;
  playSound: (key: SoundKey) => void;
}

export function useApprovalActions(deps: ApprovalActionsDeps) {
  const approvePending = async (uid: string, idx: number) => {
    const ud = structuredClone(deps.allU[uid] || freshUser()) as UserData;
    if (!ud.pendingRedemptions || !ud.pendingRedemptions[idx]) return;
    const p = ud.pendingRedemptions[idx];
    if ((ud.points || 0) < p.cost) {
      deps.notify('Not enough coins', 'error');
      return;
    }
    ud.points -= p.cost;
    if (!ud.redemptions) ud.redemptions = [];
    ud.redemptions.push({
      rewardId: p.rewardId,
      name: p.name,
      cost: p.cost,
      date: getToday(),
    });
    ud.pendingRedemptions.splice(idx, 1);
    await deps.saveUsr(uid, ud);
    deps.notify(`Approved: ${p.name}`);

    triggerHaptic('success');
    deps.playSound('approval');
    // Write in-app notification for kid
    const childName = deps.getChildName ? deps.getChildName(uid) : uid;
    writeNotification(deps.familyId, {
      type: 'loot_approved',
      title: 'Loot Approved!',
      body: `${p.name} was approved!`,
      childId: uid,
      childName,
      targetRole: 'kid',
    }).catch((err) => {
      console.warn('Notification failed (loot_approved):', err);
      Sentry.captureException(err, { level: 'warning', tags: { action: 'notification-write', type: 'loot_approved' } });
    });
  };

  const denyPending = async (uid: string, idx: number) => {
    const ud = structuredClone(deps.allU[uid] || freshUser()) as UserData;
    if (!ud.pendingRedemptions) return;
    const p = ud.pendingRedemptions[idx];
    if (!p) return;
    ud.pendingRedemptions.splice(idx, 1);
    await deps.saveUsr(uid, ud);
    deps.notify('Denied');

    triggerHaptic('error');
    deps.playSound('error');
    // Write in-app notification for kid
    const childName = deps.getChildName ? deps.getChildName(uid) : uid;
    writeNotification(deps.familyId, {
      type: 'loot_denied',
      title: 'Loot Denied',
      body: `${p.name} was denied.`,
      childId: uid,
      childName,
      targetRole: 'kid',
    }).catch((err) => {
      console.warn('Notification failed (loot_denied):', err);
      Sentry.captureException(err, { level: 'warning', tags: { action: 'notification-write', type: 'loot_denied' } });
    });
  };

  return {
    approvePending,
    denyPending,
  };
}
