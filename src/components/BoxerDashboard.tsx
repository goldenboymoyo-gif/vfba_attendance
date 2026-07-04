'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useBoxers } from '@/hooks/useBoxers';
import { useNotifications } from '@/hooks/useNotifications';
import { checkIn, checkOut, saveGoal, checkInStatus, autoCheckoutIfNeeded } from '@/lib/actions';
import { useToast } from '@/context/ToastContext';

export default function BoxerDashboard() {
  const { profile } = useAuth();
  const { boxers, loading } = useBoxers();
  const { notifications } = useNotifications(3);
  const toast = useToast();
  const [goal, setGoal] = useState('');
  const [busy, setBusy] = useState(false);
  const autoChecked = useRef(false);

  const boxerDoc = boxers.find((b) => b.id === profile?.uid);
  const canCheckin = checkInStatus();

  // Build a stable me object from either the boxer doc or the user profile
  const me = boxerDoc || (profile?.role === 'boxer' ? {
    id: profile.uid,
    name: profile.name,
    phone: profile.phone || '',
    status: 'absent' as const,
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
  } : null);

  // Auto-create the Firestore boxer doc if it doesn't exist (uses getDoc so
  // it never gets tricked by synthetic entries from the users collection).
  useEffect(() => {
    if (!profile || profile.role !== 'boxer') return;
    let cancelled = false;
    const ref = doc(db, 'boxers', profile.uid);
    getDoc(ref).then((snap) => {
      if (cancelled || snap.exists()) return;
      // Copy fields from the users doc if available (age, gender, etc. from registration)
      setDoc(ref, {
        name: profile.name,
        phone: profile.phone || '',
        status: 'absent',
        checkInTime: null,
        checkOutTime: null,
        streak: 0,
        attendancePct: 0,
        goal: '',
        regNo: (profile as any).regNo || '',
        age: (profile as any).age || 0,
        gender: (profile as any).gender || '',
        weightClass: (profile as any).weightClass || '',
        emergencyContact: (profile as any).emergencyContact || '',
        joined: new Date().toISOString().slice(0, 10),
        coachId: '',
        medicalNotes: (profile as any).medicalNotes || '',
        achievements: [],
      }).catch((e) => console.error('Failed to create boxer record:', e));
    }).catch((e) => console.error('getDoc error:', e));
    return () => { cancelled = true; };
  }, [profile]);

  useEffect(() => {
    if (loading || autoChecked.current || !me || me.status !== 'in') return;
    const now = new Date().toTimeString().slice(0, 5);
    if (now < '19:30') return;
    autoChecked.current = true;
    autoCheckoutIfNeeded(me.id, me.name).then((did) => {
      if (did) toast('You were auto-checked out (training ended at 19:30).');
    });
  }, [loading, me?.status]);

  // Poll for auto-checkout every 30s (catches the case where page is open past 19:30)
  useEffect(() => {
    if (!me || me.status !== 'in' || autoChecked.current) return;
    const id = setInterval(() => {
      const now = new Date().toTimeString().slice(0, 5);
      if (now >= '19:30' && !autoChecked.current) {
        autoChecked.current = true;
        autoCheckoutIfNeeded(me.id, me.name).then((did) => {
          if (did) toast('You were auto-checked out (training ended at 19:30).');
        });
        clearInterval(id);
      }
    }, 30000);
    return () => clearInterval(id);
  }, [me]);

  useEffect(() => {
    if (me?.goal) setGoal(me.goal);
  }, [me?.goal]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="skeleton h-[260px]" />
        <div className="skeleton h-[260px]" />
        <div className="skeleton h-[260px]" />
      </div>
    );
  }

  if (!me) {
    return (
      <div>
        <div className="mb-1 text-[12.5px] text-[var(--text-dim)]">Dashboard</div>
        <h1 className="font-display mb-5 text-[23px] font-bold tracking-tight">Welcome, {profile?.name?.split(' ')[0] || 'Boxer'}</h1>
        <div className="card py-14 text-center">
          <div className="mb-3 text-3xl">🥊</div>
          <div className="mb-2 text-lg font-bold">Setting up your profile…</div>
          <p className="mx-auto max-w-md text-sm text-[var(--text-dim)]">
            Please wait a moment while we get your dashboard ready.
          </p>
        </div>
      </div>
    );
  }

  const pct = me.attendancePct;

  async function handleToggle() {
    if (!canCheckin.allowed && me?.status !== 'in') {
      toast(canCheckin.message, false);
      return;
    }
    setBusy(true);
    try {
      if (me!.status === 'in') {
        await checkOut(me!.id);
        toast('Checked out. Duration logged.');
      } else {
        await checkIn(me!.id, me!.name, goal);
        toast('Checked in. Have a great session.');
      }
    } catch (e: any) {
      console.error(e);
      toast(e.message || 'Could not update your status — check your connection.', false);
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveGoal() {
    try {
      await saveGoal(me!.id, goal);
      toast('Goal saved for today.');
    } catch {
      toast('Could not save your goal.', false);
    }
  }

  const label = me.status === 'in' ? 'Check Out' : me.status === 'out' ? 'Complete' : 'Check In';
  const checkinDisabled = me.status !== 'in' && !canCheckin.allowed;

  return (
    <div>
      <div className="mb-1 text-[12.5px] text-[var(--text-dim)]">Dashboard</div>
      <h1 className="font-display mb-5 text-[23px] font-bold tracking-tight">Welcome back, {me.name.split(' ')[0]}</h1>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="card text-center">
          <div className="mb-2.5 text-left font-display text-[15px] font-bold">Today&apos;s Status</div>
          <div
            className="relative mx-auto my-3 flex h-[176px] w-[176px] items-center justify-center rounded-full"
            style={{ background: `conic-gradient(#A61E22 ${pct}%, var(--surface-2) 0)` }}
          >
            <div className="absolute inset-[9px] rounded-full bg-[var(--surface)]" />
            <button
              onClick={handleToggle}
              disabled={busy || me.status === 'out' || checkinDisabled}
              className="relative z-10 h-[116px] w-[116px] rounded-full text-sm font-semibold text-white transition-transform hover:scale-[1.03] active:scale-95 disabled:opacity-70"
              style={{ background: me.status === 'in' ? '#111111' : '#A61E22' }}
            >
              {busy ? '…' : label}
            </button>
          </div>
          <span className="inline-block rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs font-semibold">
            {me.status === 'in' ? 'Checked In' : me.status === 'out' ? 'Checked Out' : me.status === 'late' ? 'Late' : 'Not arrived'}
          </span>
          {checkinDisabled && (
            <div className="mt-2 text-xs text-[var(--text-dim)]">{canCheckin.message}</div>
          )}
        </div>

        <div className="grid gap-4">
          <div className="card">
            <div className="mb-2.5 font-display text-[15px] font-bold">Today&apos;s Goal</div>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={3}
              placeholder="e.g. Improve footwork and defense…"
              className="w-full rounded-xl border bg-[var(--surface-2)] px-3.5 py-3 text-sm outline-none focus:border-red"
            />
            <button onClick={handleSaveGoal} className="mt-2.5 rounded-xl bg-red px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-dark">
              Save Goal
            </button>
            <div className="mt-4 grid gap-3 border-t pt-3.5 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-[var(--surface-2)] p-3">
                <div className="text-[11px] uppercase tracking-wide text-[var(--text-dim)]">Current Streak</div>
                <div className="mt-1 font-display text-lg font-bold">{me.streak} days</div>
              </div>
              <div className="rounded-xl bg-[var(--surface-2)] p-3">
                <div className="text-[11px] uppercase tracking-wide text-[var(--text-dim)]">Attendance Rate</div>
                <div className="mt-1 font-display text-lg font-bold">{pct}%</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/attendance" className="rounded-full bg-[var(--surface-2)] px-3 py-1.5 text-xs font-semibold text-[var(--text-dim)] hover:bg-[var(--surface)]">
                My Attendance
              </Link>
              <Link href="/analysis" className="rounded-full bg-[var(--surface-2)] px-3 py-1.5 text-xs font-semibold text-[var(--text-dim)] hover:bg-[var(--surface)]">
                Analysis
              </Link>
              <Link href="/boxers" className="rounded-full bg-[var(--surface-2)] px-3 py-1.5 text-xs font-semibold text-[var(--text-dim)] hover:bg-[var(--surface)]">
                Boxer Roster
              </Link>
            </div>
          </div>

          <div className="card">
            <div className="mb-2.5 font-display text-[15px] font-bold">Coach Notifications</div>
            {notifications.length === 0 && <div className="py-4 text-center text-sm text-[var(--text-dim)]">Nothing new.</div>}
            {notifications.map((n) => (
              <div key={n.id} className="border-b py-2.5 last:border-none">
                <div className="text-[13px] font-semibold">{n.title}</div>
                <div className="text-xs text-[var(--text-dim)]">{n.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
