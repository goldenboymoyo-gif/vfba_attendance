'use client';

import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/context/AuthContext';
import { useBoxers } from '@/hooks/useBoxers';
import { setBoxerStatus, bulkAutoCheckout, AUTO_CHECKOUT_TIME } from '@/lib/actions';
import { useToast } from '@/context/ToastContext';
import { useState, useEffect, useRef } from 'react';
import type { AttendanceStatus, Boxer } from '@/lib/types';

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

const STATUS_STYLE: Record<AttendanceStatus, string> = {
  in: 'bg-[#1D7A4C]/10 text-[#1D7A4C]',
  out: 'bg-[#2159A0]/10 text-[#2159A0]',
  late: 'bg-[#9A6B0C]/10 text-[#9A6B0C]',
  absent: 'bg-red/10 text-red',
};
const STATUS_LABEL: Record<AttendanceStatus, string> = {
  in: 'Present',
  out: 'Checkout',
  late: 'Late',
  absent: 'Absent',
};

export default function AttendancePage() {
  const { profile } = useAuth();
  const { boxers, loading } = useBoxers();
  const toast = useToast();
  const [editing, setEditing] = useState<Boxer | null>(null);

  const isCoach = profile?.role === 'coach' || profile?.role === 'admin';
  const rows = isCoach ? boxers : boxers.filter((b) => b.id === profile?.uid);
  const autoChecked = useRef(false);

  // Auto-checkout all boxers at 19:30 when a coach/admin has the page open
  useEffect(() => {
    if (!isCoach || loading || autoChecked.current) return;
    const now = new Date().toTimeString().slice(0, 5);
    if (now < AUTO_CHECKOUT_TIME) return;
    const checkedIn = boxers.filter((b) => b.status === 'in');
    if (checkedIn.length === 0) return;
    autoChecked.current = true;
    bulkAutoCheckout(checkedIn.map((b) => ({ id: b.id, name: b.name })));
    toast(`Auto-checked out ${checkedIn.length} boxer${checkedIn.length > 1 ? 's' : ''} (training ended at ${AUTO_CHECKOUT_TIME}).`);
  }, [loading, isCoach, boxers]);

  // Poll every 30s to catch the exact 19:30 transition
  useEffect(() => {
    if (!isCoach || autoChecked.current) return;
    const id = setInterval(() => {
      const now = new Date().toTimeString().slice(0, 5);
      if (now >= AUTO_CHECKOUT_TIME && !autoChecked.current) {
        const checkedIn = boxers.filter((b) => b.status === 'in');
        if (checkedIn.length === 0) { autoChecked.current = true; return; }
        autoChecked.current = true;
        bulkAutoCheckout(checkedIn.map((b) => ({ id: b.id, name: b.name })));
        toast(`Auto-checked out ${checkedIn.length} boxer${checkedIn.length > 1 ? 's' : ''} (training ended at ${AUTO_CHECKOUT_TIME}).`);
        clearInterval(id);
      }
    }, 30000);
    return () => clearInterval(id);
  }, [isCoach, boxers]);

  return (
    <AppShell>
      <div className="mb-1 text-[12.5px] text-[var(--text-dim)]">Attendance</div>
      <h1 className="font-display mb-5 text-[23px] font-bold tracking-tight">
        {isCoach ? 'Attendance Log' : 'My Attendance'}
      </h1>

      {loading ? (
        <div className="skeleton h-48" />
      ) : rows.length === 0 ? (
        <div className="card py-10 text-center text-sm text-[var(--text-dim)]">No records found.</div>
      ) : (
        <>
          {/* Mobile card layout */}
          <div className="flex flex-col gap-3 sm:hidden">
            {rows.map((b) => (
              <div key={b.id} className="card">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white">
                      {initials(b.name)}
                    </div>
                    <div className="text-sm font-bold">{b.name}</div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[b.status]}`}>
                    {STATUS_LABEL[b.status]}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-dim)]">
                  <div><span className="font-semibold text-[var(--text)]">Check-in:</span> {b.checkInTime || '—'}</div>
                  <div><span className="font-semibold text-[var(--text)]">Check-out:</span> {b.checkOutTime || '—'}</div>
                </div>
                {b.goal && <div className="mt-1.5 text-xs text-[var(--text-dim)]"><span className="font-semibold text-[var(--text)]">Goal:</span> {b.goal}</div>}
                {isCoach && (
                  <button
                    onClick={() => setEditing(b)}
                    className="mt-2.5 w-full rounded-lg bg-[var(--surface-2)] py-2 text-xs font-semibold"
                  >
                    Edit Status
                  </button>
                )}
              </div>
            ))}
          </div>
          {/* Desktop table */}
          <div className="card overflow-x-auto hidden sm:block">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr className="border-b text-left text-[11.5px] uppercase tracking-wide text-[var(--text-dim)]">
                  <th className="px-3 py-2.5">Boxer</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Check-in</th>
                  <th className="px-3 py-2.5">Check-out</th>
                  <th className="px-3 py-2.5">Goal</th>
                  {isCoach && <th className="px-3 py-2.5" />}
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => (
                  <tr key={b.id} className="border-b last:border-none">
                    <td className="flex items-center gap-2 px-3 py-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[10.5px] font-semibold text-white">
                        {initials(b.name)}
                      </div>
                      {b.name}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[b.status]}`}>
                        {STATUS_LABEL[b.status]}
                      </span>
                    </td>
                    <td className="px-3 py-3">{b.checkInTime || '—'}</td>
                    <td className="px-3 py-3">{b.checkOutTime || '—'}</td>
                    <td className="max-w-[220px] px-3 py-3 text-xs text-[var(--text-dim)]">{b.goal || '—'}</td>
                    {isCoach && (
                      <td className="px-3 py-3">
                        <button
                          onClick={() => setEditing(b)}
                          className="rounded-lg bg-[var(--surface-2)] px-2.5 py-1.5 text-xs font-semibold"
                        >
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editing && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-5" onClick={() => setEditing(null)}>
          <div className="w-full max-w-[360px] rounded-2xl bg-[var(--surface)] p-6 shadow-lg2" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 font-display text-[15px] font-bold">Edit Status — {editing.name}</div>
            <div className="flex flex-col gap-2">
              {(['in', 'late', 'absent', 'out'] as AttendanceStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={async () => {
                    await setBoxerStatus(editing.id, editing.name, s);
                    toast(`${editing.name} marked ${STATUS_LABEL[s].toLowerCase()}.`);
                    setEditing(null);
                  }}
                  className={`rounded-xl border px-3.5 py-2.5 text-left text-sm font-semibold ${STATUS_STYLE[s]}`}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
