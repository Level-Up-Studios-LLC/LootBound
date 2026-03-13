import type { UserData, Redemption } from '../types.ts';
import { getToday, getWeekStart } from './time.ts';

export function freshUser(): UserData {
  return {
    points: 0,
    streak: 0,
    bestStreak: 0,
    lastPerfectDate: null,
    taskLog: {},
    redemptions: [],
    pendingRedemptions: [],
    lastTaskTime: 0,
  };
}

export function calcPts(bp: number, st: string): number {
  if (st === 'early') return Math.round(bp * 1.25);
  if (st === 'ontime') return bp;
  if (st === 'late') return Math.round(bp * 0.5);
  if (st === 'missed') return -bp;
  return 0;
}

export function countRedeems(
  redemptions: Redemption[],
  rid: string,
  lt: string
): number {
  if (!redemptions || !redemptions.length) return 0;
  var today = getToday();
  var ws = getWeekStart();
  return redemptions.filter(function (r) {
    if (r.rewardId !== rid) return false;
    if (lt === 'daily') return r.date === today;
    if (lt === 'weekly') return r.date >= ws;
    return true;
  }).length;
}
