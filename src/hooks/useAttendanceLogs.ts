'use client';

import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AttendanceLog } from '@/lib/types';

export function useAttendanceLogs(max = 30) {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'attendanceLogs'), orderBy('createdAt', 'desc'), limit(max));
    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as Omit<AttendanceLog, 'id'>) })));
      setLoading(false);
    });
    return unsub;
  }, [max]);

  return { logs, loading };
}
