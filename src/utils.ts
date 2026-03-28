import type {
  Task,
  UserData,
  Redemption,
  TierConfig,
  CoopRequest,
} from './types.ts';
import { BEDTIME, LEVEL_XP, LEVEL_TITLES } from './constants.ts';

export function freshUser(): UserData {
  return {
    points: 0,
    xp: 0,
    level: 1,
    streak: 0,
    bestStreak: 0,
    missedDaysThisWeek: 0,
    lastPerfectDate: null,
    taskLog: {},
    redemptions: [],
    pendingRedemptions: [],
    lastTaskTime: 0,
  };
}

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getToday(): string {
  return localDateStr(new Date());
}

export function getWeekStart(resetDay?: number): string {
  const day = resetDay != null ? resetDay : 0;
  const d = new Date();
  const dow = d.getDay();
  const diff = dow >= day ? dow - day : dow + 7 - day;
  const s = new Date(d);
  s.setDate(d.getDate() - diff);
  return localDateStr(s);
}

export function todayDow(): number {
  return new Date().getDay();
}

export function timeToMin(t: string): number {
  const p = t.split(':');
  return Number(p[0]) * 60 + Number(p[1]);
}

export function nowMin(): number {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

export function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

export function fmtTime(t: string): string {
  const p = t.split(':').map(Number);
  return `${p[0] % 12 || 12}:${String(p[1]).padStart(2, '0')} ${p[0] >= 12 ? 'PM' : 'AM'}`;
}

export function prevDate(d: string): string {
  const dt = new Date(`${d}T12:00:00`);
  dt.setDate(dt.getDate() - 1);
  return localDateStr(dt);
}

export function isPastBedtime(bedtime?: number): boolean {
  return nowMin() >= (bedtime != null ? bedtime : BEDTIME);
}

export function isTaskActiveToday(task: Task): boolean {
  if (task.daily) return true;
  if (task.dueDay != null) return todayDow() === task.dueDay;
  return true;
}

export function isTaskActiveTomorrow(task: Task): boolean {
  if (task.daily) return true;
  if (task.dueDay != null) {
    const tomorrowDow = (todayDow() + 1) % 7;
    return task.dueDay === tomorrowDow;
  }
  // Tasks with no schedule are always active (same as isTaskActiveToday)
  return true;
}

/**
 * Check if a task should be displayed as a tomorrow preview.
 * Daily tasks are previews after bedtime; weekly tasks are previews when
 * their dueDay matches tomorrow (only after bedtime).
 */
export function isTaskPreview(task: Task, bedtime?: number): boolean {
  if (!isPastBedtime(bedtime)) return false;
  if (task.daily) return true;
  if (task.dueDay != null) {
    const tomorrowDow = (todayDow() + 1) % 7;
    return task.dueDay === tomorrowDow;
  }
  return false;
}

/**
 * Build the set of childId:taskId keys for active/completed co-ops on a given
 * date (to exclude from solo review counts) and the list of completed co-op
 * requests for co-op review display. Both initiator and partner keys are
 * tracked so neither side leaks into the solo review list.
 */
export function buildCoopReviewData(
  coopRequests: CoopRequest[],
  date: string
): { coopTaskKeys: Set<string>; completedCoops: CoopRequest[] } {
  const coopTaskKeys = new Set<string>();
  coopRequests
    .filter(
      r =>
        r.date === date && (r.status === 'approved' || r.status === 'completed')
    )
    .forEach(r => {
      coopTaskKeys.add(`${r.initiatorId}:${r.taskId}`);
      coopTaskKeys.add(`${r.partnerId}:${r.taskId}`);
    });
  const completedCoops = coopRequests.filter(
    r => r.status === 'completed' && r.date === date
  );
  return { coopTaskKeys, completedCoops };
}

export function slugify(s: string): string {
  return `${s.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now().toString(36)}`;
}

export function getTaskStatus(
  task: Task,
  completedAt: number | null,
  bedtime?: number
): string {
  const now = nowMin();
  const s = timeToMin(task.windowStart);
  const e = timeToMin(task.windowEnd);
  const bt = bedtime != null ? bedtime : BEDTIME;
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

export function calcRewards(
  tc: TierConfig,
  status: string
): { coins: number; xp: number } {
  const mult =
    status === 'early'
      ? 1.25
      : status === 'ontime'
        ? 1.0
        : status === 'late'
          ? 0.5
          : 0;
  if (status === 'missed') return { coins: -tc.coins, xp: 0 };
  return {
    coins: Math.round(tc.coins * mult),
    xp: Math.round(tc.xp * mult),
  };
}

export function getStreakMultiplier(streak: number): number {
  if (streak >= 30) return 2.0;
  if (streak >= 21) return 1.6;
  if (streak >= 14) return 1.4;
  if (streak >= 7) return 1.25;
  if (streak >= 3) return 1.1;
  return 1.0;
}

export function getLevelFromXp(totalXp: number): number {
  for (let i = LEVEL_XP.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_XP[i]) return i + 2;
  }
  return 1;
}

export function getXpProgress(
  totalXp: number,
  level: number
): { current: number; needed: number; pct: number } {
  if (level >= 20) return { current: 0, needed: 0, pct: 100 };
  const floor = level >= 2 ? LEVEL_XP[level - 2] : 0;
  const ceil = LEVEL_XP[level - 1];
  const current = totalXp - floor;
  const needed = ceil - floor;
  const pct = needed > 0 ? Math.round((current / needed) * 100) : 100;
  return { current, needed, pct };
}

export function getLevelTitle(level: number): { title: string; color: string } {
  const idx = Math.max(0, Math.min(level - 1, LEVEL_TITLES.length - 1));
  return LEVEL_TITLES[idx];
}

export function getLevelCoinBonus(level: number): number {
  return Math.min(Math.floor(level * 1.32), 25);
}

export function resizeImg(file: File, maxW: number): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let w = img.width,
          h = img.height;
        if (w > maxW) {
          h = Math.round((h * maxW) / w);
          w = maxW;
        }
        const c = document.createElement('canvas');
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
  const today = getToday();
  const ws = getWeekStart();
  return redemptions.filter(r => {
    if (r.rewardId !== rid) return false;
    if (lt === 'daily') return r.date === today;
    if (lt === 'weekly') return r.date >= ws;
    return true;
  }).length;
}

/** Minimal MD5 hash for Gravatar URLs (not for security use). */
export function md5(input: string): string {
  const k = [
    0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a,
    0xa8304613, 0xfd469501, 0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
    0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821, 0xf61e2562, 0xc040b340,
    0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
    0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8,
    0x676f02d9, 0x8d2a4c8a, 0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
    0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70, 0x289b7ec6, 0xeaa127fa,
    0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
    0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92,
    0xffeff47d, 0x85845dd1, 0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
    0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
  ];
  const s = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5,
    9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11,
    16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10,
    15, 21,
  ];

  const bytes: number[] = [];
  for (let i = 0; i < input.length; i++) {
    let c = input.charCodeAt(i);
    // Handle surrogate pairs (characters > U+FFFF)
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < input.length) {
      const next = input.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        c = 0x10000 + ((c - 0xd800) << 10) + (next - 0xdc00);
        i++;
      }
    }
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) {
      bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else if (c < 0x10000) {
      bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    } else {
      bytes.push(
        0xf0 | (c >> 18),
        0x80 | ((c >> 12) & 0x3f),
        0x80 | ((c >> 6) & 0x3f),
        0x80 | (c & 0x3f)
      );
    }
  }

  const origLen = bytes.length;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const bitLen = origLen * 8;
  bytes.push(
    bitLen & 0xff,
    (bitLen >> 8) & 0xff,
    (bitLen >> 16) & 0xff,
    (bitLen >> 24) & 0xff
  );
  bytes.push(0, 0, 0, 0);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let i = 0; i < bytes.length; i += 64) {
    const m: number[] = [];
    for (let j = 0; j < 16; j++) {
      m[j] =
        bytes[i + j * 4] |
        (bytes[i + j * 4 + 1] << 8) |
        (bytes[i + j * 4 + 2] << 16) |
        (bytes[i + j * 4 + 3] << 24);
    }

    let a = a0,
      b = b0,
      c = c0,
      d = d0;
    for (let j = 0; j < 64; j++) {
      let f: number, g: number;
      if (j < 16) {
        f = (b & c) | (~b & d);
        g = j;
      } else if (j < 32) {
        f = (d & b) | (~d & c);
        g = (5 * j + 1) % 16;
      } else if (j < 48) {
        f = b ^ c ^ d;
        g = (3 * j + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * j) % 16;
      }

      f = (f + a + k[j] + m[g]) >>> 0;
      a = d;
      d = c;
      c = b;
      b = (b + ((f << s[j]) | (f >>> (32 - s[j])))) >>> 0;
    }
    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }

  const hex = (n: number) =>
    [0, 8, 16, 24]
      .map(sh => ((n >>> sh) & 0xff).toString(16).padStart(2, '0'))
      .join('');
  return hex(a0) + hex(b0) + hex(c0) + hex(d0);
}
