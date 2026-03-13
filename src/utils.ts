import type { Task, UserData, Redemption } from './types.ts';
import { BEDTIME } from './constants.ts';

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

export function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export function getWeekStart(resetDay?: number): string {
  var day = resetDay != null ? resetDay : 0;
  var d = new Date();
  var dow = d.getDay();
  var diff = dow >= day ? dow - day : dow + 7 - day;
  var s = new Date(d);
  s.setDate(d.getDate() - diff);
  return s.toISOString().split('T')[0];
}

export function todayDow(): number {
  return new Date().getDay();
}

export function timeToMin(t: string): number {
  var p = t.split(':');
  return Number(p[0]) * 60 + Number(p[1]);
}

export function nowMin(): number {
  var n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

export function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

export function fmtTime(t: string): string {
  var p = t.split(':').map(Number);
  return (
    (p[0] % 12 || 12) +
    ':' +
    String(p[1]).padStart(2, '0') +
    ' ' +
    (p[0] >= 12 ? 'PM' : 'AM')
  );
}

export function prevDate(d: string): string {
  var dt = new Date(d + 'T12:00:00');
  dt.setDate(dt.getDate() - 1);
  return dt.toISOString().split('T')[0];
}

export function isPastBedtime(bedtime?: number): boolean {
  return nowMin() >= (bedtime != null ? bedtime : BEDTIME);
}

export function isTaskActiveToday(task: Task): boolean {
  if (task.daily) return true;
  if (task.dueDay != null) return todayDow() === task.dueDay;
  return true;
}

export function slugify(s: string): string {
  return (
    s.toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + Date.now().toString(36)
  );
}

export function getTaskStatus(task: Task, completedAt: number | null, bedtime?: number): string {
  var now = nowMin();
  var s = timeToMin(task.windowStart);
  var e = timeToMin(task.windowEnd);
  var bt = bedtime != null ? bedtime : BEDTIME;
  if (completedAt != null) {
    if (completedAt < s) return 'early';
    if (completedAt <= e) return 'ontime';
    return 'late';
  }
  if (now >= bt) return 'missed';
  if (now < s) return 'upcoming';
  if (now <= e) return 'active';
  return 'overdue';
}

export function calcPts(bp: number, st: string): number {
  if (st === 'early') return Math.round(bp * 1.25);
  if (st === 'ontime') return bp;
  if (st === 'late') return Math.round(bp * 0.5);
  if (st === 'missed') return -bp;
  return 0;
}

export function resizeImg(file: File, maxW: number): Promise<string> {
  return new Promise(function (resolve) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var w = img.width,
          h = img.height;
        if (w > maxW) {
          h = Math.round((h * maxW) / w);
          w = maxW;
        }
        var c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        c.getContext('2d')!.drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', 0.7));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
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
