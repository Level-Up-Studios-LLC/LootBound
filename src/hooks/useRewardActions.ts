import type { Config, UserData, Reward } from '../types.ts';
import { freshUser, getToday, countRedeems } from '../utils.ts';
import { writeNotification } from '../services/firestoreStorage.ts';
import { triggerHaptic } from '../services/platform.ts';
import type { SoundKey } from '../services/notificationSound.ts';

interface RewardActionsDeps {
  cfg: Config | null;
  allU: Record<string, UserData>;
  curUser: string | null;
  familyId: string;
  saveUsr: (uid: string, data: UserData) => Promise<void>;
  notify: (msg: string, type?: string) => void;
  getChildName?: (id: string) => string;
  playSound: (key: SoundKey) => void;
}

export function useRewardActions(deps: RewardActionsDeps) {
  const canRedeem = (
    uid: string,
    reward: Reward
  ): { ok: boolean; reason: string | null } => {
    const ud = deps.allU[uid] || freshUser();
    if ((ud.points || 0) < reward.cost)
      return { ok: false, reason: 'Not enough coins' };
    if (
      reward.limitType &&
      reward.limitType !== 'none' &&
      reward.limitMax > 0
    ) {
      const c = countRedeems(ud.redemptions, reward.id, reward.limitType);
      if (c >= reward.limitMax)
        return {
          ok: false,
          reason: `Limit reached (${reward.limitMax}/${reward.limitType === 'daily' ? 'day' : 'wk'})`,
        };
    }
    return { ok: true, reason: null };
  };

  const needsApproval = (reward: Reward): boolean => {
    return (
      reward.requireApproval ||
      reward.cost >= (deps.cfg ? deps.cfg.approvalThreshold : 300)
    );
  };

  const requestRedemption = async (reward: Reward) => {
    const uid = deps.curUser;
    if (!uid || uid === 'parent') return;
    const check = canRedeem(uid, reward);
    if (!check.ok) {
      deps.notify(check.reason || 'Cannot redeem', 'error');
      return;
    }
    if (needsApproval(reward)) {
      const ud = structuredClone(deps.allU[uid] || freshUser()) as UserData;
      if (!ud.pendingRedemptions) ud.pendingRedemptions = [];
      ud.pendingRedemptions.push({
        rewardId: reward.id,
        name: reward.name,
        cost: reward.cost,
        icon: reward.icon,
        date: getToday(),
        requestedAt: Date.now(),
      });
      await deps.saveUsr(uid, ud);
      deps.notify('Sent for approval');

      triggerHaptic('light');
      deps.playSound('approval');
      // Write in-app notification for parent
      const childName = deps.getChildName ? deps.getChildName(uid) : uid;
      writeNotification(deps.familyId, {
        type: 'loot_request',
        title: 'Loot Request',
        body: `${childName} requested ${reward.name} (${reward.cost} coins)`,
        childId: uid,
        childName,
        targetRole: 'parent',
      }).catch(() => {
        /* ignore */
      });
      return;
    }
    await execRedeem(uid, reward);
  };

  const execRedeem = async (uid: string, reward: Reward) => {
    const ud = structuredClone(deps.allU[uid] || freshUser()) as UserData;
    if ((ud.points || 0) < reward.cost) return;
    ud.points -= reward.cost;
    if (!ud.redemptions) ud.redemptions = [];
    ud.redemptions.push({
      rewardId: reward.id,
      name: reward.name,
      cost: reward.cost,
      date: getToday(),
    });
    await deps.saveUsr(uid, ud);
    deps.notify(`Redeemed: ${reward.name}`);

    triggerHaptic('success');
    deps.playSound('success');
  };

  return {
    canRedeem,
    needsApproval,
    requestRedemption,
    execRedeem,
  };
}
