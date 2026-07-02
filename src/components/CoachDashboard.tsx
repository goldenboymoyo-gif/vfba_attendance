'use client';

import { CheckCircle2, Clock, XCircle, Users, Send, X } from 'lucide-react';
import { useBoxers } from '@/hooks/useBoxers';
import { useAttendanceLogs } from '@/hooks/useAttendanceLogs';
import { useNotifications } from '@/hooks/useNotifications';
import { StatCard } from '@/components/StatCard';
import { useState, useEffect, useRef } from 'react';
import { sendNotification, deleteNotification, autoCheckoutIfNeeded } from '@/lib/actions';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { NotificationPriority, NotificationType } from '@/lib/types';

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function CoachDashboard() {
  const { boxers, loading } = useBoxers();
  const { logs } = useAttendanceLogs(8);
  const { notifications } = useNotifications(5);
  const { profile } = useAuth();
  const toast = useToast();
  const [composing, setComposing] = useState(false);
  const autoChecked = useRef(false);

  useEffect(() => {
    if (loading || autoChecked.current) return;
    const now = new Date().toTimeString().slice(0, 5);
    if (now < '19:20') { autoChecked.current = true; return; }
    autoChecked.current = true;
    boxers.forEach((b) => {
      if (b.status === 'in') {
        autoCheckoutIfNeeded(b.id, b.name).then((did) => {
          if (did) toast(`${b.name} was auto-checked out.`);
        });
      }
    });
  }, [loading]);

  const present = boxers.filter((b) => b.status === 'in').length;
  const late = boxers.filter((b) => b.status === 'late').length;
  const absent = boxers.filter((b) => b.status === 'absent').length;
  const total = boxers.length;

  return (
    <div>
      <div className="mb-1 text-[12.5px] text-[var(--text-dim)]">Dashboard</div>
      <h1 className="font-display mb-5 text-[23px] font-bold tracking-tight">
        Good evening, {profile?.name || 'Coach'}
      </h1>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-[120px]" />
          ))}
        </div>
      ) : (
        <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard icon={<CheckCircle2 size={20} strokeWidth={1.7} />} value={present} label="Present Now" tint={{ bg: 'rgba(29,122,76,.10)', color: '#1D7A4C' }} />
          <StatCard icon={<Clock size={20} strokeWidth={1.7} />} value={late} label="Late Arrivals" tint={{ bg: 'rgba(154,107,12,.12)', color: '#9A6B0C' }} />
          <StatCard icon={<XCircle size={20} strokeWidth={1.7} />} value={absent} label="Absent Today" tint={{ bg: 'rgba(166,30,34,.10)', color: '#A61E22' }} />
          <StatCard icon={<Users size={20} strokeWidth={1.7} />} value={total} label="Total Roster" tint={{ bg: 'rgba(33,89,160,.10)', color: '#2159A0' }} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="card">
          <div className="mb-2.5 flex items-center justify-between">
            <div className="font-display text-[15px] font-bold">Recent Check-ins</div>
            <span className="rounded-lg border px-2.5 py-1 text-xs font-semibold">Live</span>
          </div>
          {logs.length === 0 && <div className="py-6 text-center text-sm text-[var(--text-dim)]">No activity yet today.</div>}
          {logs.map((l) => (
            <div key={l.id} className="flex items-center gap-3 border-b py-2.5 last:border-none">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white">
                {initials(l.boxerName || '?')}
              </div>
              <div className="flex-1 text-[13.5px]">
                <strong>{l.boxerName}</strong>{' '}
                <span className="text-[var(--text-dim)]">{l.checkOutTime ? 'checked out' : 'checked in'}</span>
              </div>
              <span className="text-xs text-[var(--text-dim)]">{l.checkOutTime || l.checkInTime}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="mb-2.5 font-display text-[15px] font-bold">Notifications</div>
          {notifications.length === 0 && <div className="py-6 text-center text-sm text-[var(--text-dim)]">All caught up.</div>}
          {notifications.map((n) => (
            <div key={n.id} className="flex items-start gap-3 border-b py-2.5 last:border-none group">
              <span className="rounded-md bg-[var(--surface-2)] px-2 py-1 text-[11px] font-semibold">{n.type}</span>
              <div className="flex-1">
                <div className="text-[13px] font-semibold">{n.title}</div>
                <div className="text-xs text-[var(--text-dim)]">{n.body}</div>
              </div>
              <button
                onClick={async () => {
                  await deleteNotification(n.id);
                  toast('Notification deleted.');
                }}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border hover:bg-red hover:text-white"
                title="Delete notification"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          <button
            onClick={() => setComposing(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-red py-2.5 text-sm font-semibold text-white hover:bg-red-dark"
          >
            <Send size={14} /> Send Notification
          </button>
        </div>
      </div>

      {composing && profile && (
        <ComposeModal
          onClose={() => setComposing(false)}
          onSend={async (title, body, type, priority) => {
            await sendNotification({ title, body, type, priority, createdBy: profile.uid });
            toast('Notification sent to all boxers.');
            setComposing(false);
          }}
        />
      )}
    </div>
  );
}

function ComposeModal({
  onClose,
  onSend,
}: {
  onClose: () => void;
  onSend: (title: string, body: string, type: NotificationType, priority: NotificationPriority) => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<NotificationType>('General');

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-5" onClick={onClose}>
      <div className="w-full max-w-[420px] rounded-2xl bg-[var(--surface)] p-7 shadow-lg2" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 font-display text-[15px] font-bold">Send Notification</div>
        <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--text-dim)]">Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as NotificationType)}
          className="mb-3 w-full rounded-xl border bg-[var(--surface-2)] px-3.5 py-3 text-sm"
        >
          {(['General', 'Training', 'Tournament', 'Emergency', 'Reminder'] as NotificationType[]).map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--text-dim)]">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Training starts at 5PM"
          className="mb-3 w-full rounded-xl border bg-[var(--surface-2)] px-3.5 py-3 text-sm"
        />
        <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--text-dim)]">Message</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Bring mouth guards…"
          className="mb-4 w-full rounded-xl border bg-[var(--surface-2)] px-3.5 py-3 text-sm"
        />
        <button
          onClick={() => title && onSend(title, body, type, 'normal')}
          className="w-full rounded-xl bg-red py-3 text-sm font-semibold text-white hover:bg-red-dark"
        >
          Send to all boxers
        </button>
      </div>
    </div>
  );
}
