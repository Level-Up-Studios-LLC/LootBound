export interface Child {
  id: string;
  name: string;
  age: number;
  avatar: string;
  color: string;
  pin: string | null;
}

export interface Task {
  id: string;
  name: string;
  tier: string;
  windowStart: string;
  windowEnd: string;
  daily: boolean;
  dueDay: number | null;
  dueDays?: number[]; // Array of day indices (0=Sun..6=Sat) for "Specific Days" frequency
  frequency?: 'daily' | 'specific_days' | 'once'; // explicit frequency type (defaults to daily/weekly via `daily` flag for backward compat)
  photoRequired?: boolean; // default true — require photo proof on completion
  createdAt?: string; // ISO date (YYYY-MM-DD) — tasks created on this date skip same-day bedtime penalty
}

export interface Reward {
  id: string;
  name: string;
  cost: number;
  icon: string;
  active: boolean;
  limitType: string;
  limitMax: number;
  requireApproval: boolean;
}

export interface Redemption {
  rewardId: string;
  name: string;
  cost: number;
  date: string;
}

export interface PendingRedemption {
  rewardId: string;
  name: string;
  cost: number;
  icon: string;
  date: string;
  requestedAt: number;
}

export interface TaskLogEntry {
  completedAt: number | null;
  status: string;
  points: number;
  xp: number;
  photo: string | null;
  rejected: boolean;
  autoCutoff?: boolean;
  coopRequestId?: string;
  coopRole?: 'initiator' | 'partner';
  coopPartnerId?: string;
  coopPartnerCompleted?: boolean;
  coopFailed?: boolean;
}

export interface StatusLabel {
  text: string;
  color: string;
  bg: string;
}

export interface UserData {
  points: number;
  xp: number;
  level: number;
  streak: number;
  bestStreak: number;
  missedDaysThisWeek: number;
  lastPerfectDate: string | null;
  taskLog: Record<string, Record<string, any>>;
  redemptions: Redemption[];
  pendingRedemptions: PendingRedemption[];
  lastTaskTime: number;
}

export interface ResetOptions {
  coins?: boolean;
  xpLevels?: boolean;
  streaks?: boolean;
  taskHistory?: boolean;
  redemptions?: boolean;
}

export interface TierConfig {
  coins: number;
  xp: number;
}

export interface Config {
  children: Child[];
  tasks: Record<string, Task[]>;
  rewards: Reward[];
  parentPin: string;
  tierConfig: Record<string, TierConfig>;
  approvalThreshold: number;
  lastWeeklyReset: string;
  familyCode?: string;
  bedtime?: number;
  weeklyResetDay?: number;
  cooldown?: number;
  parentName?: string;
  referralSource?: string;
  notificationPrefs?: NotificationPrefs;
}

export interface Notification {
  msg: string;
  type: string;
}

export interface AddChildFormData {
  name: string;
  age: string;
  avatar: string;
  color: string;
}

export interface KidPinEditState {
  uid: string | null;
  val: string;
}

export interface ReviewTaskItem {
  uid: string;
  child: Child;
  task: Task;
  entry: TaskLogEntry;
}

export interface ApprovalItem {
  uid: string;
  child: Child;
  pending: PendingRedemption;
  idx: number;
}

export interface InAppNotification {
  id: string;
  type:
    | 'mission_complete'
    | 'mission_rejected'
    | 'loot_request'
    | 'loot_approved'
    | 'loot_denied'
    | 'level_up'
    | 'streak'
    | 'coop_request'
    | 'coop_accepted'
    | 'coop_declined'
    | 'coop_approved'
    | 'coop_denied'
    | 'coop_cancelled'
    | 'coop_partner_done'
    | 'coop_complete'
    | 'coop_expired';
  title: string;
  body: string;
  childId?: string;
  childName?: string;
  targetRole: 'parent' | 'kid';
  read: boolean;
  createdAt: number;
}

export interface NotificationPrefs {
  soundEnabled: boolean;
  missionComplete: boolean;
  missionRejected: boolean;
  lootRequest: boolean;
  lootApproved: boolean;
  lootDenied: boolean;
  levelUp: boolean;
  streak: boolean;
  coopUpdates: boolean;
}

export type CoopStatus =
  | 'pending_partner'
  | 'pending_parent'
  | 'declined'
  | 'approved'
  | 'denied'
  | 'cancelled'
  | 'completed'
  | 'expired';

export interface CoopRequest {
  id: string;
  taskId: string;
  initiatorId: string;
  partnerId: string;
  status: CoopStatus;
  date: string; // YYYY-MM-DD
  createdAt: number;
  partnerRespondedAt: number | null;
  parentResolvedAt: number | null;
  completedAt: number | null;
  windowStartOverride: string | null; // "HH:MM"
  windowEndOverride: string | null; // "HH:MM"
  coinOverride: number | null;
  initiatorCompleted: boolean;
  partnerCompleted: boolean;
  taskName: string;
  taskTier: string;
  initiatorName: string;
  partnerName: string;
}
