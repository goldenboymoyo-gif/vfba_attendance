'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';
import { Trash2, Shield, Users, UserCheck } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import type { UserProfile } from '@/lib/types';

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function AdminPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [coaches, setCoaches] = useState<UserProfile[]>([]);
  const [boxerCount, setBoxerCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile && profile.role !== 'admin') router.replace('/dashboard');
  }, [profile, router]);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('name'));
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map((d: any) => ({ uid: d.id, ...(d.data() as Omit<UserProfile, 'uid'>) }));
      setCoaches(all.filter((u: any) => u.role === 'coach'));
      setBoxerCount(all.filter((u: any) => u.role === 'boxer').length);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function handleDeleteCoach(uid: string, name: string) {
    if (!confirm(`Remove coach "${name}"? The coach will lose all access.`)) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
      toast(`Coach ${name} removed.`);
    } catch {
      toast('Failed to remove coach.', false);
    }
  }

  return (
    <AppShell>
      <div className="mb-1 text-[12.5px] text-[var(--text-dim)]">Admin</div>
      <h1 className="font-display mb-5 text-[23px] font-bold tracking-tight">Admin Dashboard</h1>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton h-[120px]" />)}
        </div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-3">
            <StatCard icon={<Shield size={20} strokeWidth={1.7} />} value={coaches.length} label="Total Coaches" tint={{ bg: 'rgba(166,30,34,.10)', color: '#A61E22' }} />
            <StatCard icon={<Users size={20} strokeWidth={1.7} />} value={boxerCount} label="Registered Boxers" tint={{ bg: 'rgba(29,122,76,.10)', color: '#1D7A4C' }} />
            <StatCard icon={<UserCheck size={20} strokeWidth={1.7} />} value={coaches.length + boxerCount} label="Total Users" tint={{ bg: 'rgba(33,89,160,.10)', color: '#2159A0' }} />
          </div>

          <div className="card">
            <div className="mb-3 font-display text-[15px] font-bold">Coaches</div>
            {coaches.length === 0 && (
              <div className="py-6 text-center text-sm text-[var(--text-dim)]">
                No coaches yet. Coaches can register themselves via the /register page.
              </div>
            )}
            <div className="flex flex-col gap-2">
              {coaches.map((c) => (
                <div key={c.uid} className="flex items-center justify-between rounded-xl bg-[var(--surface-2)] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
                      {initials(c.name)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{c.name}</div>
                      <div className="text-xs text-[var(--text-dim)]">{c.email}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteCoach(c.uid, c.name)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border text-red hover:bg-red hover:text-white"
                    title="Remove coach"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl border border-dashed p-3 text-xs text-[var(--text-dim)]">
              Coaches register themselves at the /register page. To fully delete a coach, delete their Auth user from Firebase Console too.
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
