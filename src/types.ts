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
