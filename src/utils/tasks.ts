import type { Task } from '../types.ts';
import { BEDTIME } from '../constants.ts';
import { todayDow, nowMin, timeToMin } from './time.ts';

export function isTaskActiveToday(task: Task): boolean {
  if (task.daily) return true;
  if (task.dueDay != null) return todayDow() === task.dueDay;
  return true;
}

export function getTaskStatus(
  task: Task,
  completedAt: number | null,
  bedtime?: number
): string {
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
