import { useState, useRef, useEffect } from 'react';
import type { Notification } from '../types.ts';

export function useNotification() {
  const [notif, setNotif] = useState<Notification | null>(null);
  const nRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (nRef.current) clearTimeout(nRef.current);
    };
  }, []);

  const notify = (msg: string, type?: string) => {
    if (nRef.current) clearTimeout(nRef.current);
    setNotif({ msg, type: type || 'success' });
    const dur = type === 'levelup' ? 4000 : 2500;
    nRef.current = setTimeout(() => {
      setNotif(null);
    }, dur);
  };

  return { notif, notify };
}
