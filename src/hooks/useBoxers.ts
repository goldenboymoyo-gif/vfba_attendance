'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Boxer } from '@/lib/types';

function syncedBoxerFromUser(id: string, u: Record<string, any>): Boxer {
  return {
    id,
    name: u.name || '',
    phone: u.phone || '',
    status: 'absent',
    checkInTime: null,
    checkOutTime: null,
    streak: 0,
    attendancePct: 0,
    goal: '',
    regNo: '',
    age: 0,
    gender: '',
    weightClass: '',
    emergencyContact: '',
    joined: new Date().toISOString().slice(0, 10),
    coachId: '',
    medicalNotes: '',
    achievements: [],
  };
}

export function useBoxers() {
  const [boxers, setBoxers] = useState<Boxer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let boxersMap: Record<string, Boxer> = {};
    let usersMap: Record<string, Record<string, any>> = {};
    let unsubBoxers: (() => void) | null = null;
    let unsubUsers: (() => void) | null = null;

    function merge() {
      const seen = new Set<string>();
      const merged: Boxer[] = [];
      for (const [id, b] of Object.entries(boxersMap)) {
        merged.push(b);
        seen.add(id);
      }
      for (const [id, u] of Object.entries(usersMap)) {
        if (!seen.has(id)) {
          merged.push(syncedBoxerFromUser(id, u));
        }
      }
      merged.sort((a, b) => a.name.localeCompare(b.name));
      setBoxers(merged);
    }

    unsubBoxers = onSnapshot(
      query(collection(db, 'boxers'), orderBy('name')),
      (snap) => {
        boxersMap = {};
        snap.forEach((d: any) => {
          boxersMap[d.id] = { id: d.id, ...(d.data() as Omit<Boxer, 'id'>) };
        });
        merge();
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError('Could not load the boxer roster in real time.');
        setLoading(false);
      }
    );

    unsubUsers = onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'boxer')),
      (snap) => {
        usersMap = {};
        snap.forEach((d: any) => {
          usersMap[d.id] = d.data();
        });
        merge();
      },
      (err) => console.error('users snapshot error (non-fatal):', err)
    );

    return () => {
      unsubBoxers?.();
      unsubUsers?.();
    };
  }, []);

  return { boxers, loading, error };
}
