import type { Notification } from '../types.ts';

interface NotificationToastProps {
  notif: Notification | null;
}

export default function NotificationToast(p: NotificationToastProps) {
  if (!p.notif) return null;
  var isSuccess = p.notif.type === 'success';
  return (
    <div
      className={
        'fixed top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-btn font-bold text-sm z-[1000] text-white shadow-lg animate-slide-up ' +
        (isSuccess ? 'bg-qteal' : 'bg-qcoral')
      }
    >
      {p.notif.msg}
    </div>
  );
}
