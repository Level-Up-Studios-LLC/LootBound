import type { UserData } from '../types.ts';
import { freshUser, getToday } from '../utils.ts';
import { writeNotification } from '../services/firestoreStorage.ts';
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
  async function approvePending(uid: string, idx: number) {
    var ud = JSON.parse(
      JSON.stringify(deps.allU[uid] || freshUser())
    ) as UserData;
    if (!ud.pendingRedemptions || !ud.pendingRedemptions[idx]) return;
    var p = ud.pendingRedemptions[idx];
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
    deps.notify('Approved: ' + p.name);

    deps.playSound('approval');
    // Write in-app notification for kid
    var childName = deps.getChildName ? deps.getChildName(uid) : uid;
    writeNotification(deps.familyId, {
      type: 'loot_approved',
      title: 'Loot Approved!',
      body: p.name + ' was approved!',
      childId: uid,
      childName: childName,
      targetRole: 'kid',
    }).catch(function () { /* ignore */ });
  }

  async function denyPending(uid: string, idx: number) {
    var ud = JSON.parse(
      JSON.stringify(deps.allU[uid] || freshUser())
    ) as UserData;
    if (!ud.pendingRedemptions) return;
    var p = ud.pendingRedemptions[idx];
    if (!p) return;
    ud.pendingRedemptions.splice(idx, 1);
    await deps.saveUsr(uid, ud);
    deps.notify('Denied');

    deps.playSound('error');
    // Write in-app notification for kid
    var childName = deps.getChildName ? deps.getChildName(uid) : uid;
    writeNotification(deps.familyId, {
      type: 'loot_denied',
      title: 'Loot Denied',
      body: p.name + ' was denied.',
      childId: uid,
      childName: childName,
      targetRole: 'kid',
    }).catch(function () { /* ignore */ });
  }

  return {
    approvePending: approvePending,
    denyPending: denyPending,
  };
}
