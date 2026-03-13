import { useState, useRef } from 'react';
import type { Notification } from '../types.ts';

export function useNotification() {
  var _notif = useState<Notification | null>(null),
    notif = _notif[0],
    setNotif = _notif[1];
  var nRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function notify(msg: string, type?: string) {
    if (nRef.current) clearTimeout(nRef.current);
    setNotif({ msg: msg, type: type || 'success' });
    nRef.current = setTimeout(function () {
      setNotif(null);
    }, 2500);
  }

  return { notif: notif, notify: notify };
}
