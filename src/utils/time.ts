import { BEDTIME } from '../constants.ts';

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
