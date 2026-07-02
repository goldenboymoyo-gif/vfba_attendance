'use client';

import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import { Menu, Search, Moon, Sun, Bell, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { deleteNotification } from '@/lib/actions';
import { useToast } from '@/context/ToastContext';

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { theme, setTheme } = useTheme();
  const { profile } = useAuth();
  const { notifications } = useNotifications(10);
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  useEffect(() => setMounted(true), []);

  const unread = notifications.length; // in a full build, track read state per user
  const canDeleteNotif = profile?.role === 'coach' || profile?.role === 'admin';

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-[var(--bg)]/80 px-5 py-3.5 backdrop-blur-md md:px-7">
      <div className="flex items-center gap-3">
        <button onClick={onMenu} className="flex h-9 w-9 items-center justify-center rounded-[11px] border bg-[var(--surface)] lg:hidden">
          <Menu size={18} />
        </button>
        <div className="hidden w-[280px] items-center gap-2 rounded-xl border bg-[var(--surface)] px-3.5 py-2.5 md:flex">
          <Search size={15} className="text-[var(--text-dim)]" />
          <input placeholder="Search boxers, sessions…" className="w-full bg-transparent text-sm outline-none" />
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex h-9 w-9 items-center justify-center rounded-[11px] border bg-[var(--surface)]"
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        )}
        <div className="relative">
          <button
            onClick={() => setShowNotif((s) => !s)}
            className="relative flex h-9 w-9 items-center justify-center rounded-[11px] border bg-[var(--surface)]"
          >
            <Bell size={17} />
            {unread > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-[var(--surface)] bg-red" />
            )}
          </button>
          {showNotif && (
            <div className="absolute right-0 mt-2 w-80 max-w-[85vw] rounded-2xl border bg-[var(--surface)] p-3 shadow-lg2">
              <div className="mb-1.5 px-1 text-sm font-bold">Notifications</div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 && (
                  <div className="p-4 text-center text-sm text-[var(--text-dim)]">All caught up.</div>
                )}
                {notifications.map((n) => (
                  <div key={n.id} className="flex items-start gap-2 border-b py-2.5 last:border-none">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold">{n.title}</div>
                      <div className="text-xs text-[var(--text-dim)]">{n.body}</div>
                    </div>
                    {canDeleteNotif && (
                      <button
                        onClick={async () => {
                          await deleteNotification(n.id);
                          toast('Notification deleted.');
                        }}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border hover:bg-red hover:text-white"
                        title="Delete notification"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-[13px] font-semibold text-white dark:bg-[var(--surface-2)] dark:text-[var(--text)]">
          {profile ? initials(profile.name) : '··'}
        </div>
      </div>
    </div>
  );
}
