'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/context/AuthContext';
import { confirmTournament } from '@/lib/actions';
import { useToast } from '@/context/ToastContext';
import type { Tournament } from '@/lib/types';

function useTournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const q = query(collection(db, 'tournaments'), orderBy('date'));
    const unsub = onSnapshot(q, (snap) => {
      setTournaments(snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as Omit<Tournament, 'id'>) })));
      setLoading(false);
    });
    return unsub;
  }, []);
  return { tournaments, loading };
}

function daysUntil(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400000));
}

export default function TournamentsPage() {
  const { tournaments, loading } = useTournaments();
  const { profile } = useAuth();
  const toast = useToast();

  return (
    <AppShell>
      <div className="mb-1 text-[12.5px] text-[var(--text-dim)]">Tournaments</div>
      <h1 className="font-display mb-5 text-[23px] font-bold tracking-tight">Tournaments</h1>

      {loading && <div className="skeleton h-40" />}
      {!loading && tournaments.length === 0 && (
        <div className="card py-10 text-center text-sm text-[var(--text-dim)]">
          No tournaments yet. Coaches can add one directly in Firestore (or wire up a create-tournament form here).
        </div>
      )}

      <div className="flex flex-col gap-4">
        {tournaments.map((t) => {
          const confirmed = profile ? t.confirmedBoxerIds?.includes(profile.uid) : false;
          return (
            <div key={t.id} className="card bg-gradient-to-br from-red to-red-dark text-white">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="rounded-lg bg-white/15 px-2.5 py-1 text-xs font-semibold">Upcoming</span>
                  <h2 className="mt-2.5 text-xl font-bold">{t.name}</h2>
                  <div className="mt-1.5 text-[13.5px] opacity-90">
                    {t.venue} · {t.date} · {t.time}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {t.weightClasses?.map((c) => (
                      <span key={c} className="rounded-lg bg-white/15 px-2.5 py-1 text-xs font-semibold">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-center">
                  <div className="font-display text-[42px] font-extrabold leading-none">{daysUntil(t.date)}</div>
                  <div className="text-[11px] opacity-85">DAYS TO GO</div>
                </div>
              </div>
              {profile?.role === 'boxer' && (
                <button
                  disabled={confirmed}
                  onClick={async () => {
                    await confirmTournament(t.id, profile.uid);
                    toast('Attendance confirmed.');
                  }}
                  className="mt-4 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
                >
                  {confirmed ? 'Attendance confirmed' : 'Confirm My Attendance'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
