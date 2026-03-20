import type { StatusLabel, TierConfig } from './types.ts';

export const CFG_KEY = 'qb-cfg-v5';
export const childKey = (id: string): string => {
  return `qb-child-${id}-v5`;
};

export const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
export const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const TIER_ORDER: string[] = ['S', 'A', 'B', 'C', 'D', 'F'];

export const DEF_TIER_CONFIG: Record<string, TierConfig> = {
  S: { coins: 50, xp: 40 },
  A: { coins: 30, xp: 25 },
  B: { coins: 20, xp: 18 },
  C: { coins: 12, xp: 12 },
  D: { coins: 7, xp: 7 },
  F: { coins: 3, xp: 3 },
};

export const TIER_COLORS: Record<string, string> = {
  S: '#eab308',
  A: '#ef4444',
  B: '#3b82f6',
  C: '#22c55e',
  D: '#a855f7',
  F: '#6b7280',
};

export const LEVEL_XP: number[] = [
  120, 200, 290, 395, 510,
  640, 785, 940, 1115, 1305,
  1510, 1730, 1965, 2220, 2495,
  2785, 3095, 3425, 3775, 4150,
];

export const LEVEL_TITLES: { title: string; color: string }[] = [
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
export const BEDTIME = 21 * 60;
export const COOLDOWN = 60;
export const AVATARS = [
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
export const COLORS = [
  '#3b82f6',
  '#ec4899',
  '#22c55e',
  '#f97316',
  '#a855f7',
  '#14b8a6',
  '#eab308',
  '#ef4444',
];

export const SL: Record<string, StatusLabel> = {
  early: { text: 'EARLY', color: '#8b7ec8', bg: 'rgba(139,126,200,0.12)' },
  ontime: { text: 'ON TIME', color: '#4AC7A8', bg: 'rgba(74,199,168,0.12)' },
  late: { text: 'LATE', color: '#e8a44a', bg: 'rgba(232,164,74,0.12)' },
  missed: { text: 'MISSED', color: '#e05a5a', bg: 'rgba(224,90,90,0.12)' },
  active: { text: 'DO NOW', color: '#e6a817', bg: 'rgba(230,168,23,0.12)' },
  upcoming: { text: 'UPCOMING', color: '#a0a3b5', bg: 'rgba(160,163,181,0.1)' },
  overdue: { text: 'OVERDUE', color: '#e05a5a', bg: 'rgba(224,90,90,0.12)' },
  rejected: { text: 'REDO', color: '#FF8C94', bg: 'rgba(255,140,148,0.12)' },
};

export const FA_ICON_STYLE = {
  '--fa-primary-color': '#4B4E6D',
  '--fa-secondary-color': '#FF8C94',
  '--fa-secondary-opacity': '1',
} as any;

export const altBg = (index: number): string => {
  return index % 2 === 0 ? 'bg-qmint' : 'bg-qyellow';
};

export const KID_NAV = [
  { id: 'dashboard', icon: 'house-chimney', label: 'HQ' },
  { id: 'tasks', icon: 'crosshairs', label: 'Missions' },
  { id: 'scores', icon: 'crown', label: 'Ranks' },
  { id: 'store', icon: 'treasure-chest', label: 'Loot' },
];
