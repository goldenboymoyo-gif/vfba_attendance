'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/context/AuthContext';
import { confirmTournament, createTournament, deleteTournament } from '@/lib/actions';
import { useToast } from '@/context/ToastContext';
import { Plus, Trash2 } from 'lucide-react';
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
  const [showCreate, setShowCreate] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const isCoachOrAdmin = profile?.role === 'coach' || profile?.role === 'admin';

  async function handleDelete(t: Tournament) {
    if (!confirm(`Delete "${t.name}" permanently?`)) return;
    setDeleting(t.id);
    try {
      await deleteTournament(t.id);
      toast('Tournament deleted.');
    } catch (e: any) {
      toast(e.message || 'Failed to delete tournament.', false);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <AppShell>
      <div className="mb-1 text-[12.5px] text-[var(--text-dim)]">Tournaments</div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-display text-[23px] font-bold tracking-tight">Tournaments</h1>
        {isCoachOrAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-xl bg-red px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-dark"
          >
            <Plus size={16} /> Create Tournament
          </button>
        )}
      </div>

      {loading && <div className="skeleton h-40" />}
      {!loading && tournaments.length === 0 && (
        <div className="card py-10 text-center text-sm text-[var(--text-dim)]">
          No tournaments yet.
        </div>
      )}

      <div className="flex flex-col gap-4">
        {tournaments.map((t) => {
          const confirmed = profile ? t.confirmedBoxerIds?.includes(profile.uid) : false;
          return (
            <div key={t.id} className="card bg-gradient-to-br from-red to-red-dark text-white relative">
              {isCoachOrAdmin && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(t); }}
                  disabled={deleting === t.id}
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 hover:bg-white/30 disabled:opacity-40"
                  title="Delete tournament"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="rounded-lg bg-white/15 px-2.5 py-1 text-xs font-semibold">Upcoming</span>
                  <h2 className="mt-2.5 text-xl font-bold">{t.name}</h2>
                  <div className="mt-1.5 text-[13.5px] opacity-90">
                    {t.venue} &middot; {t.date} &middot; {t.time}
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

      {showCreate && profile && (
        <CreateTournamentModal
          onClose={() => setShowCreate(false)}
          onCreate={async (data) => {
            await createTournament(data);
            toast('Tournament created.');
            setShowCreate(false);
          }}
        />
      )}
    </AppShell>
  );
}

function CreateTournamentModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: { name: string; venue: string; date: string; time: string; weightClasses: string[]; notes?: string }) => void;
}) {
  const [name, setName] = useState('');
  const [venue, setVenue] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [weightClasses, setWeightClasses] = useState('');
  const [notes, setNotes] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !venue.trim() || !date || !time) return;
    const wc = weightClasses.split(',').map((s) => s.trim()).filter(Boolean);
    onCreate({ name: name.trim(), venue: venue.trim(), date, time, weightClasses: wc, notes: notes.trim() || undefined });
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-5" onClick={onClose}>
      <div className="w-full max-w-[480px] rounded-2xl bg-[var(--surface)] p-7 shadow-lg2" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 font-display text-[15px] font-bold">Create Tournament</div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-[12.5px] font-semibold text-[var(--text-dim)]">Tournament Name *</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="VFBA Championships" className="w-full rounded-xl border bg-[var(--surface-2)] px-3.5 py-3 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-[12.5px] font-semibold text-[var(--text-dim)]">Venue *</label>
            <input required value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Victoria Falls Hall" className="w-full rounded-xl border bg-[var(--surface-2)] px-3.5 py-3 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[12.5px] font-semibold text-[var(--text-dim)]">Date *</label>
              <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border bg-[var(--surface-2)] px-3.5 py-3 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-[12.5px] font-semibold text-[var(--text-dim)]">Time *</label>
              <input required type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-xl border bg-[var(--surface-2)] px-3.5 py-3 text-sm" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[12.5px] font-semibold text-[var(--text-dim)]">Weight Classes (comma-separated)</label>
            <input value={weightClasses} onChange={(e) => setWeightClasses(e.target.value)} placeholder="Lightweight, Welterweight, Heavyweight" className="w-full rounded-xl border bg-[var(--surface-2)] px-3.5 py-3 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-[12.5px] font-semibold text-[var(--text-dim)]">Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-xl border bg-[var(--surface-2)] px-3.5 py-3 text-sm" />
          </div>
          <button type="submit" className="mt-1 w-full rounded-xl bg-red py-3 text-sm font-semibold text-white hover:bg-red-dark">
            Create Tournament
          </button>
        </form>
      </div>
    </div>
  );
}
