'use client';

import { AppShell } from '@/components/AppShell';
import { useBoxers } from '@/hooks/useBoxers';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import type { Boxer } from '@/lib/types';

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function BoxersPage() {
  const { profile } = useAuth();
  const { boxers, loading } = useBoxers();
  const toast = useToast();
  const [selected, setSelected] = useState<Boxer | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const canManageBoxers = profile?.role === 'coach' || profile?.role === 'admin';

  async function handleDelete(uid: string, name: string) {
    if (!confirm(`Remove ${name} permanently? This cannot be undone.`)) return;
    setRemoving(uid);
    try {
      const res = await fetch('/api/boxers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast(`${name} removed.`);
    } catch (e: any) {
      toast(e.message || 'Failed to remove boxer.', false);
    } finally {
      setRemoving(null);
    }
  }

  return (
    <AppShell>
      <div className="mb-1 text-[12.5px] text-[var(--text-dim)]">Boxers</div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-display text-[23px] font-bold tracking-tight">Boxer Roster</h1>
        {canManageBoxers && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 rounded-xl bg-red px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-dark"
          >
            <Plus size={16} /> Add Boxer
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-[150px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {boxers.map((b) => (
            <div key={b.id} className="card relative cursor-pointer" onClick={() => setSelected(b)}>
              {canManageBoxers && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(b.id, b.name); }}
                  disabled={removing === b.id}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg border bg-[var(--surface)] text-red hover:bg-red hover:text-white disabled:opacity-40"
                  title="Remove boxer"
                >
                  <Trash2 size={13} />
                </button>
              )}
              <div className="mb-2.5 flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">
                  {initials(b.name)}
                </div>
                <span className="rounded-full bg-[var(--surface-2)] px-2 py-1 text-[11px] font-semibold">
                  {b.status === 'in' ? 'In gym' : b.status === 'out' ? 'Left' : b.status === 'late' ? 'Late' : 'Absent'}
                </span>
              </div>
              <div className="text-[14.5px] font-bold">{b.name}</div>
              <div className="mb-2 text-xs text-[var(--text-dim)]">
                {b.regNo || 'No reg'} · Age {b.age || '?'}
              </div>
              <span className="rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-semibold">{b.weightClass || 'Unassigned'}</span>
              <div className="mt-3">
                <div className="h-2 overflow-hidden rounded-md bg-[var(--surface-2)]">
                  <div className="h-full rounded-md bg-gradient-to-r from-red to-gold" style={{ width: `${b.attendancePct}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-5" onClick={() => setSelected(null)}>
          <div className="w-full max-w-[420px] rounded-2xl bg-[var(--surface)] p-7 shadow-lg2" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-lg font-semibold text-white">
                {initials(selected.name)}
              </div>
              <div>
                <div className="text-[17px] font-bold">{selected.name}</div>
                <div className="text-xs text-[var(--text-dim)]">
                  {selected.regNo || 'No reg'} · {selected.weightClass || 'Unassigned'}
                </div>
              </div>
            </div>
            <div className="mb-3.5 flex flex-col gap-3 text-sm">
              <div>
                <label className="mb-1 block text-[11.5px] font-semibold text-[var(--text-dim)]">Age / Gender</label>
                <div className="text-sm">{selected.age || '?'} · {selected.gender || '?'}</div>
              </div>
              <div>
                <label className="mb-1 block text-[11.5px] font-semibold text-[var(--text-dim)]">Joined</label>
                <div className="text-sm">{selected.joined || '?'}</div>
              </div>
              <div>
                <label className="mb-1 block text-[11.5px] font-semibold text-[var(--text-dim)]">Phone</label>
                <div className="text-sm">{selected.phone || '—'}</div>
              </div>
              <div>
                <label className="mb-1 block text-[11.5px] font-semibold text-[var(--text-dim)]">Emergency</label>
                <div className="text-sm">{selected.emergencyContact || '—'}</div>
              </div>
            </div>
            <label className="mb-1 block text-[11.5px] font-semibold text-[var(--text-dim)]">Medical Notes</label>
            <div className="mb-3.5 rounded-lg bg-[var(--surface-2)] px-2.5 py-1.5 text-xs">{selected.medicalNotes || 'None'}</div>
            <label className="mb-1 block text-[11.5px] font-semibold text-[var(--text-dim)]">Achievements</label>
            <div className="mb-5 flex flex-wrap gap-1.5">
              {selected.achievements?.length ? (
                selected.achievements.map((a) => (
                  <span key={a} className="rounded-lg border px-2 py-1 text-xs font-semibold">{a}</span>
                ))
              ) : (
                <span className="text-xs text-[var(--text-dim)]">None yet</span>
              )}
            </div>
            <button
              onClick={() => setSelected(null)}
              className="w-full rounded-xl bg-red py-2.5 text-sm font-semibold text-white hover:bg-red-dark"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showAdd && <AddBoxerModal onClose={() => setShowAdd(false)} />}
    </AppShell>
  );
}

function AddBoxerModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const { profile } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [regNo, setRegNo] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [weightClass, setWeightClass] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch('/api/boxers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          regNo,
          age: parseInt(age) || 0,
          gender,
          weightClass,
          phone,
          emergencyContact,
          medicalNotes,
          coachId: profile.uid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(`Boxer created! Initial password: ${data.defaultPassword}`);
      toast(`${name} added to the roster.`);
      setName(''); setEmail(''); setRegNo(''); setAge(''); setGender(''); setWeightClass(''); setPhone(''); setEmergencyContact(''); setMedicalNotes('');
    } catch (e: any) {
      toast(e.message || 'Failed to add boxer.', false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-5" onClick={onClose}>
      <div className="w-full max-w-[480px] rounded-2xl bg-[var(--surface)] p-7 shadow-lg2" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 font-display text-[15px] font-bold">Add New Boxer</div>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="mb-1 block text-[11.5px] font-semibold text-[var(--text-dim)]">Full Name *</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-red" />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-[11.5px] font-semibold text-[var(--text-dim)]">Email *</label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-red" />
          </div>
          <div>
            <label className="mb-1 block text-[11.5px] font-semibold text-[var(--text-dim)]">Reg No.</label>
            <input value={regNo} onChange={(e) => setRegNo(e.target.value)} placeholder="VFBA-XXX" className="w-full rounded-xl border bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-red" />
          </div>
          <div>
            <label className="mb-1 block text-[11.5px] font-semibold text-[var(--text-dim)]">Age</label>
            <input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="w-full rounded-xl border bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-red" />
          </div>
          <div>
            <label className="mb-1 block text-[11.5px] font-semibold text-[var(--text-dim)]">Gender</label>
            <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full rounded-xl border bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-red">
              <option value="">—</option>
              <option>Male</option>
              <option>Female</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11.5px] font-semibold text-[var(--text-dim)]">Weight Class</label>
            <input value={weightClass} onChange={(e) => setWeightClass(e.target.value)} className="w-full rounded-xl border bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-red" />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-[11.5px] font-semibold text-[var(--text-dim)]">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-xl border bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-red" />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-[11.5px] font-semibold text-[var(--text-dim)]">Emergency Contact</label>
            <input value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} className="w-full rounded-xl border bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-red" />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-[11.5px] font-semibold text-[var(--text-dim)]">Medical Notes</label>
            <textarea value={medicalNotes} onChange={(e) => setMedicalNotes(e.target.value)} rows={2} className="w-full rounded-xl border bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-red" />
          </div>

          {result && <div className="col-span-2 rounded-xl bg-[#1D7A4C]/10 p-3 text-xs text-[#1D7A44]">{result}</div>}

          <button
            type="submit"
            disabled={submitting}
            className="col-span-2 mt-1 rounded-xl bg-red py-3 text-sm font-semibold text-white hover:bg-red-dark disabled:opacity-60"
          >
            {submitting ? 'Creating...' : 'Add Boxer'}
          </button>
        </form>
      </div>
    </div>
  );
}
