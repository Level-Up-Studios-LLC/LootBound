import type { Notification } from '../types.ts';

interface NotificationToastProps {
  notif: Notification | null;
}

export default function NotificationToast(p: NotificationToastProps) {
  if (!p.notif) return null;
  const isLevelUp = p.notif.type === 'levelup';
  const isSuccess = p.notif.type === 'success' || isLevelUp;
  const bg = isLevelUp ? 'bg-qpurple' : isSuccess ? 'bg-qteal' : 'bg-qcoral';
  return (
    <div
      className={
        'fixed top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-btn font-bold text-sm z-[1000] text-white shadow-lg animate-slide-up ' +
        bg + (isLevelUp ? ' animate-confetti' : '')
      }
    >
      {isLevelUp ? '🎉 ' : ''}{p.notif.msg}
    </div>
  );
}
