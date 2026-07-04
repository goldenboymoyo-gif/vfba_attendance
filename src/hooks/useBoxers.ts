'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Boxer } from '@/lib/types';

function syncedBoxerFromUser(id: string, u: Record<string, any>): Boxer {
  return {
    id,
    name: u.name || '',
    phone: u.phone || '',
    regNo: u.regNo || '',
    age: u.age || 0,
    gender: u.gender || '',
    weightClass: u.weightClass || '',
    emergencyContact: u.emergencyContact || '',
    joined: new Date().toISOString().slice(0, 10),
    coachId: '',
    status: 'absent',
    checkInTime: null,
    checkOutTime: null,
    streak: 0,
    attendancePct: 0,
    goal: '',
    medicalNotes: u.medicalNotes || '',
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
    let unsub: (() => void) | null = null;
    let cancelled = false;

    function merge() {
      if (cancelled) return;
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
      setLoading(false);
    }

    // One-time fetch of boxer users (catches registrations where the boxer
    // doc hasn't been created yet — the dashboard will create it).
    getDocs(query(collection(db, 'users'), where('role', '==', 'boxer')))
      .then((snap) => {
        usersMap = {};
        snap.forEach((d: any) => { usersMap[d.id] = d.data(); });
        merge();
      })
      .catch((err) => console.error('users fetch error (non-fatal):', err));

    // Real-time listener on boxers for live check-in changes
    unsub = onSnapshot(
      query(collection(db, 'boxers'), orderBy('name')),
      (snap) => {
        boxersMap = {};
        snap.forEach((d: any) => {
          boxersMap[d.id] = { id: d.id, ...(d.data() as Omit<Boxer, 'id'>) };
        });
        merge();
      },
      (err) => {
        console.error(err);
        setError('Could not load the boxer roster in real time.');
        setLoading(false);
      }
    );

    return () => { cancelled = true; unsub?.(); };
  }, []);

  return { boxers, loading, error };
}
