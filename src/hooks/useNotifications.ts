'use client';

import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppNotification } from '@/lib/types';

export function useNotifications(max = 25) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(max));
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as Omit<AppNotification, 'id'>) })));
      setLoading(false);
    });
    return unsub;
  }, [max]);

  return { notifications, loading };
}
