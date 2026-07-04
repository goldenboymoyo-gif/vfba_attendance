'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';
import { Trash2, Shield, Users, UserCheck, Search, Wrench } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import type { UserProfile } from '@/lib/types';

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-red/10 text-red',
  coach: 'bg-[#2159A0]/10 text-[#2159A0]',
  boxer: 'bg-[#1D7A4C]/10 text-[#1D7A4C]',
};

export default function AdminPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [filter, setFilter] = useState<'all' | 'coach' | 'boxer'>('all');
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [repairing, setRepairing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile && profile.role !== 'admin') router.replace('/dashboard');
  }, [profile, router]);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('name'));
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map((d: any) => ({ uid: d.id, ...(d.data() as Omit<UserProfile, 'uid'>) }));
      setAllUsers(all);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function handleDeleteUser(uid: string, name: string) {
    if (!confirm(`Permanently delete "${name}"? This removes their Auth account and all data.`)) return;
    setDeleting(uid);
    try {
      await deleteDoc(doc(db, 'boxers', uid));
      await deleteDoc(doc(db, 'users', uid));
      // Try to delete Auth user via API — if it fails, Firestore docs are still removed
      fetch(`/api/boxers?uid=${encodeURIComponent(uid)}`, { method: 'DELETE' }).catch(() => {});
      toast(`${name} deleted. They can sign up again.`);
    } catch (e: any) {
      toast(e.message || 'Failed to delete user.', false);
    } finally {
      setDeleting(null);
    }
  }

  async function handleRepairBoxers() {
    if (!confirm('Create missing boxer records for all registered boxers?')) return;
    setRepairing(true);
    try {
      const res = await fetch('/api/boxers/repair', { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error);
      toast('Missing boxer records created.');
    } catch (e: any) {
      toast(e.message || 'Repair failed.', false);
    } finally {
      setRepairing(false);
    }
  }

  const coaches = allUsers.filter((u) => u.role === 'coach');
  const boxers = allUsers.filter((u) => u.role === 'boxer');

  const filtered = allUsers.filter((u) => {
    if (filter === 'coach' && u.role !== 'coach') return false;
    if (filter === 'boxer' && u.role !== 'boxer') return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
    }
    return u.role !== 'admin'; // hide admin from list
  });

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
            <StatCard icon={<Users size={20} strokeWidth={1.7} />} value={boxers.length} label="Registered Boxers" tint={{ bg: 'rgba(29,122,76,.10)', color: '#1D7A4C' }} />
            <StatCard icon={<UserCheck size={20} strokeWidth={1.7} />} value={coaches.length + boxers.length} label="Total Users" tint={{ bg: 'rgba(33,89,160,.10)', color: '#2159A0' }} />
          </div>

          <div className="card">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="font-display text-[15px] font-bold">All Accounts</div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-[180px] rounded-xl border bg-[var(--surface-2)] py-1.5 pl-8 pr-3 text-xs outline-none focus:border-red sm:w-[240px]"
                  />
                </div>
                <button
                  onClick={handleRepairBoxers}
                  disabled={repairing}
                  className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold text-[var(--text-dim)] hover:bg-[var(--surface-2)] disabled:opacity-40"
                  title="Create missing boxer records"
                >
                  <Wrench size={13} />
                  {repairing ? 'Fixing…' : 'Repair'}
                </button>
                {(['all', 'coach', 'boxer'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${filter === f ? 'bg-red text-white' : 'bg-[var(--surface-2)] text-[var(--text-dim)]'}`}
                  >
                    {f === 'all' ? 'All' : f === 'coach' ? 'Coaches' : 'Boxers'}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 && (
              <div className="py-8 text-center text-sm text-[var(--text-dim)]">
                {search ? 'No users match your search.' : 'No accounts found.'}
              </div>
            )}

            {/* Mobile cards */}
            <div className="flex flex-col gap-2 sm:hidden">
              {filtered.map((u) => (
                <div key={u.uid} className="flex items-center justify-between rounded-xl bg-[var(--surface-2)] px-3.5 py-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
                      {initials(u.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold">{u.name}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_STYLES[u.role]}`}>
                          {u.role}
                        </span>
                      </div>
                      <div className="truncate text-xs text-[var(--text-dim)]">{u.email}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteUser(u.uid, u.name)}
                    disabled={deleting === u.uid}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-red hover:bg-red hover:text-white disabled:opacity-40"
                    title="Delete user"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block">
              <table className="w-full border-collapse text-[13.5px]">
                <thead>
                  <tr className="border-b text-left text-[11.5px] uppercase tracking-wide text-[var(--text-dim)]">
                    <th className="px-3 py-2.5">Name</th>
                    <th className="px-3 py-2.5">Email</th>
                    <th className="px-3 py-2.5">Role</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.uid} className="border-b last:border-none">
                      <td className="flex items-center gap-2.5 px-3 py-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white">
                          {initials(u.name)}
                        </div>
                        <span className="font-semibold">{u.name}</span>
                      </td>
                      <td className="px-3 py-3 text-[var(--text-dim)]">{u.email}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_STYLES[u.role]}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={() => handleDeleteUser(u.uid, u.name)}
                          disabled={deleting === u.uid}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border text-red hover:bg-red hover:text-white disabled:opacity-40"
                          title="Delete user"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
