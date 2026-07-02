'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Boxer } from '@/lib/types';

/**
 * Subscribes to the `boxers` collection in real time. Any check-in,
 * check-out, or coach edit written to Firestore from ANY device shows up
 * here within moments — no polling, no refresh needed.
 */
export function useBoxers() {
  const [boxers, setBoxers] = useState<Boxer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'boxers'), orderBy('name'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setBoxers(snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as Omit<Boxer, 'id'>) })));
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError('Could not load the boxer roster in real time.');
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  return { boxers, loading, error };
}
