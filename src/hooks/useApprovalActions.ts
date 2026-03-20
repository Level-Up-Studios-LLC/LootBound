import type { UserData } from '../types.ts';
import { freshUser, getToday } from '../utils.ts';

interface ApprovalActionsDeps {
  allU: Record<string, UserData>;
  saveUsr: (uid: string, data: UserData) => Promise<void>;
  notify: (msg: string, type?: string) => void;
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
  };

  const denyPending = async (uid: string, idx: number) => {
    const ud = structuredClone(deps.allU[uid] || freshUser()) as UserData;
    if (!ud.pendingRedemptions) return;
    ud.pendingRedemptions.splice(idx, 1);
    await deps.saveUsr(uid, ud);
    deps.notify('Denied');
  };

  return {
    approvePending,
    denyPending,
  };
}
