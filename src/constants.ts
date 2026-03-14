import type { Child, Task, Reward, StatusLabel } from './types.ts';

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
export var DEF_TIER_PTS: Record<number, number> = { 1: 5, 2: 10, 3: 20, 4: 30 };
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

export var DEF_CHILDREN: Child[] = [
  {
    id: 'donovan',
    name: 'Donovan',
    age: 12,
    avatar: '🎮',
    color: '#3b82f6',
    pin: null,
  },
  {
    id: 'imani',
    name: 'Imani',
    age: 6,
    avatar: '🌟',
    color: '#ec4899',
    pin: null,
  },
];

export var DEF_TASKS: Record<string, Task[]> = {
  donovan: [
    {
      id: 'd1',
      name: 'Make bed',
      tier: 2,
      windowStart: '07:00',
      windowEnd: '09:00',
      daily: true,
      dueDay: null,
    },
    {
      id: 'd2',
      name: 'Brush teeth (AM)',
      tier: 1,
      windowStart: '06:30',
      windowEnd: '08:00',
      daily: true,
      dueDay: null,
    },
    {
      id: 'd3',
      name: 'Brush teeth (PM)',
      tier: 1,
      windowStart: '20:00',
      windowEnd: '21:00',
      daily: true,
      dueDay: null,
    },
    {
      id: 'd4',
      name: 'Homework',
      tier: 3,
      windowStart: '16:00',
      windowEnd: '18:00',
      daily: true,
      dueDay: null,
    },
    {
      id: 'd5',
      name: 'Clear plate after dinner',
      tier: 1,
      windowStart: '18:00',
      windowEnd: '20:00',
      daily: true,
      dueDay: null,
    },
    {
      id: 'd6',
      name: 'Take out trash',
      tier: 2,
      windowStart: '18:00',
      windowEnd: '20:00',
      daily: true,
      dueDay: null,
    },
    {
      id: 'd7',
      name: 'Put away laundry',
      tier: 2,
      windowStart: '17:00',
      windowEnd: '19:00',
      daily: true,
      dueDay: null,
    },
    {
      id: 'd8',
      name: 'Read for 20 min',
      tier: 2,
      windowStart: '19:00',
      windowEnd: '21:00',
      daily: true,
      dueDay: null,
    },
    {
      id: 'd9',
      name: 'Shower',
      tier: 2,
      windowStart: '19:00',
      windowEnd: '21:00',
      daily: true,
      dueDay: null,
    },
    {
      id: 'd10',
      name: 'Clean room',
      tier: 3,
      windowStart: '10:00',
      windowEnd: '12:00',
      daily: false,
      dueDay: 6,
    },
  ],
  imani: [
    {
      id: 'i1',
      name: 'Make bed',
      tier: 1,
      windowStart: '07:00',
      windowEnd: '09:00',
      daily: true,
      dueDay: null,
    },
    {
      id: 'i2',
      name: 'Brush teeth (AM)',
      tier: 1,
      windowStart: '07:00',
      windowEnd: '08:30',
      daily: true,
      dueDay: null,
    },
    {
      id: 'i3',
      name: 'Brush teeth (PM)',
      tier: 1,
      windowStart: '19:30',
      windowEnd: '20:30',
      daily: true,
      dueDay: null,
    },
    {
      id: 'i4',
      name: 'Pick up toys',
      tier: 2,
      windowStart: '18:00',
      windowEnd: '19:30',
      daily: true,
      dueDay: null,
    },
    {
      id: 'i5',
      name: 'Put shoes away',
      tier: 1,
      windowStart: '15:00',
      windowEnd: '17:00',
      daily: true,
      dueDay: null,
    },
    {
      id: 'i6',
      name: 'Clear plate',
      tier: 1,
      windowStart: '18:00',
      windowEnd: '19:30',
      daily: true,
      dueDay: null,
    },
    {
      id: 'i7',
      name: 'Clothes in hamper',
      tier: 1,
      windowStart: '19:00',
      windowEnd: '20:30',
      daily: true,
      dueDay: null,
    },
    {
      id: 'i8',
      name: 'Practice reading',
      tier: 2,
      windowStart: '16:00',
      windowEnd: '17:30',
      daily: true,
      dueDay: null,
    },
  ],
};

export var DEF_REWARDS: Reward[] = [
  {
    id: 'r1',
    name: '15 min extra screen time',
    cost: 50,
    icon: '📱',
    active: true,
    limitType: 'daily',
    limitMax: 2,
    requireApproval: false,
  },
  {
    id: 'r2',
    name: "Pick what's for dinner",
    cost: 100,
    icon: '🍕',
    active: true,
    limitType: 'daily',
    limitMax: 1,
    requireApproval: false,
  },
  {
    id: 'r3',
    name: 'Small toy or treat ($5)',
    cost: 150,
    icon: '🎁',
    active: true,
    limitType: 'weekly',
    limitMax: 2,
    requireApproval: false,
  },
  {
    id: 'r4',
    name: 'Movie night pick',
    cost: 200,
    icon: '🎬',
    active: true,
    limitType: 'weekly',
    limitMax: 1,
    requireApproval: false,
  },
  {
    id: 'r5',
    name: 'Stay up 30 min late',
    cost: 250,
    icon: '🌙',
    active: true,
    limitType: 'daily',
    limitMax: 1,
    requireApproval: false,
  },
  {
    id: 'r6',
    name: 'Friend sleepover',
    cost: 300,
    icon: '🏠',
    active: true,
    limitType: 'weekly',
    limitMax: 1,
    requireApproval: false,
  },
  {
    id: 'r7',
    name: 'Big reward ($20 item)',
    cost: 500,
    icon: '🏆',
    active: true,
    limitType: 'none',
    limitMax: 0,
    requireApproval: true,
  },
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

export var KID_NAV = [
  { id: 'dashboard', icon: 'house', label: 'HQ' },
  { id: 'tasks', icon: 'crosshairs', label: 'Missions' },
  { id: 'scores', icon: 'trophy', label: 'Ranks' },
  { id: 'store', icon: 'treasure-chest', label: 'Loot' },
];
