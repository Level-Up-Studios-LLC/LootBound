import type { StatusLabel, TierConfig, NotificationPrefs } from './types.ts';

export var CFG_KEY = 'qb-cfg-v5';
export function childKey(id: string): string {
  return 'qb-child-' + id + '-v5';
}

export var DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
export var DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export var TIER_ORDER: string[] = ['S', 'A', 'B', 'C', 'D', 'F'];

export var DEF_TIER_CONFIG: Record<string, TierConfig> = {
  S: { coins: 50, xp: 40 },
  A: { coins: 30, xp: 25 },
  B: { coins: 20, xp: 18 },
  C: { coins: 12, xp: 12 },
  D: { coins: 7, xp: 7 },
  F: { coins: 3, xp: 3 },
};

export var TIER_COLORS: Record<string, string> = {
  S: '#eab308',
  A: '#ef4444',
  B: '#3b82f6',
  C: '#22c55e',
  D: '#a855f7',
  F: '#6b7280',
};

// Cumulative XP thresholds for levels 2-20.
// Formula: 50 * level^1.5 per level, accumulated.
export var LEVEL_XP: number[] = [
  50, 191, 450, 850, 1409,
  2143, 3069, 4200, 5550, 7131,
  8955, 11033, 13376, 15995, 18899,
  22099, 25603, 29421, 33561, 38033,
];

export var LEVEL_TITLES: { title: string; color: string }[] = [
  { title: 'Rookie', color: '#6b7280' },
  { title: 'Rookie', color: '#6b7280' },
  { title: 'Rookie', color: '#6b7280' },
  { title: 'Adventurer', color: '#22c55e' },
  { title: 'Adventurer', color: '#22c55e' },
  { title: 'Adventurer', color: '#22c55e' },
  { title: 'Guardian', color: '#3b82f6' },
  { title: 'Guardian', color: '#3b82f6' },
  { title: 'Guardian', color: '#3b82f6' },
  { title: 'Champion', color: '#a855f7' },
  { title: 'Champion', color: '#a855f7' },
  { title: 'Champion', color: '#a855f7' },
  { title: 'Hero', color: '#f97316' },
  { title: 'Hero', color: '#f97316' },
  { title: 'Hero', color: '#f97316' },
  { title: 'Legend', color: '#eab308' },
  { title: 'Legend', color: '#eab308' },
  { title: 'Legend', color: '#eab308' },
  { title: 'Mythic', color: '#ef4444' },
  { title: 'Mythic', color: '#ef4444' },
];
export var BEDTIME = 21 * 60;
export var COOLDOWN = 60;
export var AVATARS = [
  '🎮',
  '🌟',
  '⚽',
  '🎨',
  '🦁',
  '🐱',
  '🚀',
  '🌈',
  '🎵',
  '🦄',
  '🐶',
  '🏀',
  '📚',
  '🌺',
  '🦋',
  '🐸',
];
export var COLORS = [
  '#3b82f6',
  '#ec4899',
  '#22c55e',
  '#f97316',
  '#a855f7',
  '#14b8a6',
  '#eab308',
  '#ef4444',
];

export var SL: Record<string, StatusLabel> = {
  early: { text: 'EARLY', color: '#8b7ec8', bg: 'rgba(139,126,200,0.12)' },
  ontime: { text: 'ON TIME', color: '#4AC7A8', bg: 'rgba(74,199,168,0.12)' },
  late: { text: 'LATE', color: '#e8a44a', bg: 'rgba(232,164,74,0.12)' },
  missed: { text: 'MISSED', color: '#e05a5a', bg: 'rgba(224,90,90,0.12)' },
  active: { text: 'DO NOW', color: '#e6a817', bg: 'rgba(230,168,23,0.12)' },
  upcoming: { text: 'UPCOMING', color: '#a0a3b5', bg: 'rgba(160,163,181,0.1)' },
  overdue: { text: 'OVERDUE', color: '#e05a5a', bg: 'rgba(224,90,90,0.12)' },
  rejected: { text: 'REDO', color: '#FF8C94', bg: 'rgba(255,140,148,0.12)' },
};

export var FA_ICON_STYLE = {
  '--fa-primary-color': '#4B4E6D',
  '--fa-secondary-color': '#FF8C94',
  '--fa-secondary-opacity': '1',
} as any;

export function altBg(index: number): string {
  return index % 2 === 0 ? 'bg-qmint' : 'bg-qyellow';
}

export var DEF_NOTIFICATION_PREFS: NotificationPrefs = {
  soundEnabled: true,
  missionComplete: true,
  missionRejected: true,
  lootRequest: true,
  lootApproved: true,
  lootDenied: true,
  levelUp: true,
  streak: true,
};

export var KID_NAV = [
  { id: 'dashboard', icon: 'house-chimney', label: 'HQ' },
  { id: 'tasks', icon: 'crosshairs', label: 'Missions' },
  { id: 'scores', icon: 'crown', label: 'Ranks' },
  { id: 'store', icon: 'treasure-chest', label: 'Loot' },
];
