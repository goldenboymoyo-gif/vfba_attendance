'use client';

import { useTheme } from 'next-themes';
import { useState, useEffect, useRef } from 'react';
import { Menu, Search, Moon, Sun, Bell, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { deleteNotification } from '@/lib/actions';
import { useToast } from '@/context/ToastContext';
import { collection, getDocs, query as qf, orderBy, limit as limitQ } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

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
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [results, setResults] = useState({ boxers: [], tournaments: [], logs: [] } as any);
  const debounceRef = useRef<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!search || search.trim() === '') {
      setResults({ boxers: [], tournaments: [], logs: [] });
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      try {
        const q = search.trim().toLowerCase();

        // Boxers
        const bSnap = await getDocs(qf(collection(db, 'boxers'), orderBy('name'), limitQ(100)));
        const bx: any[] = [];
        bSnap.forEach((d) => {
          const data: any = { id: d.id, ...(d.data() as any) };
          const hay = `${data.name || ''} ${data.regNo || ''} ${data.phone || ''} ${data.weightClass || ''}`.toLowerCase();
          if (hay.includes(q)) bx.push(data);
        });

        // Tournaments
        const tSnap = await getDocs(qf(collection(db, 'tournaments'), orderBy('name'), limitQ(50)));
        const ts: any[] = [];
        tSnap.forEach((d) => {
          const data: any = { id: d.id, ...(d.data() as any) };
          const hay = `${data.name || ''} ${data.venue || ''} ${data.notes || ''}`.toLowerCase();
          if (hay.includes(q)) ts.push(data);
        });

        // Attendance logs (recent)
        const lSnap = await getDocs(qf(collection(db, 'attendanceLogs'), orderBy('createdAt'), limitQ(300)));
        const ls: any[] = [];
        lSnap.forEach((d) => {
          const data: any = { id: d.id, ...(d.data() as any) };
          const hay = `${data.boxerName || ''} ${data.date || ''} ${data.status || ''}`.toLowerCase();
          if (hay.includes(q)) ls.push(data);
        });

        setResults({ boxers: bx.slice(0, 6), tournaments: ts.slice(0, 6), logs: ls.slice(0, 6) });
      } catch (e) {
        console.error('Search error', e);
      }
    }, 320);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [search]);
  useEffect(() => setMounted(true), []);

  const unread = notifications.length; // in a full build, track read state per user
  const canDeleteNotif = profile?.role === 'coach' || profile?.role === 'admin';

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-[var(--bg)]/80 px-5 py-3.5 backdrop-blur-md md:px-7">
      <div className="flex items-center gap-3">
        <button onClick={onMenu} className="flex h-9 w-9 items-center justify-center rounded-[11px] border bg-[var(--surface)] lg:hidden">
          <Menu size={18} />
        </button>
        <div className="hidden w-[320px] items-center gap-2 rounded-xl border bg-[var(--surface)] px-3.5 py-2.5 md:flex relative">
          <Search size={15} className="text-[var(--text-dim)]" />
          <input
            placeholder="Search boxers, tournaments, sessions…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowSearch(true); }}
            onFocus={() => setShowSearch(true)}
            className="w-full bg-transparent text-sm outline-none"
          />
          {showSearch && (
            <div className="absolute left-0 top-full mt-2 w-[520px] max-w-[95vw] rounded-2xl border bg-[var(--surface)] p-3 shadow-lg2">
              {search.trim() === '' ? (
                <div className="text-sm text-[var(--text-dim)]">Type to search boxers, tournaments or sessions</div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {results.boxers.length === 0 && results.tournaments.length === 0 && results.logs.length === 0 && (
                    <div className="p-3 text-sm text-[var(--text-dim)]">No results.</div>
                  )}

                  {results.boxers.length > 0 && (
                    <div className="mb-2">
                      <div className="mb-1.5 px-1 text-sm font-bold">Boxers</div>
                      {results.boxers.map((b: any) => (
                        <div key={b.id} className="flex items-center gap-2 border-b py-2.5 last:border-none hover:bg-[var(--surface-2)] cursor-pointer" onClick={() => { setShowSearch(false); setSearch(''); router.push('/boxers'); }}>
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">{b.name.split(' ').map((w:string)=>w[0]).slice(0,2).join('').toUpperCase()}</div>
                          <div className="min-w-0">
                            <div className="text-[13px] font-semibold">{b.name}</div>
                            <div className="text-xs text-[var(--text-dim)]">{b.regNo || b.phone || 'No details'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {results.tournaments.length > 0 && (
                    <div className="mb-2">
                      <div className="mb-1.5 px-1 text-sm font-bold">Tournaments</div>
                      {results.tournaments.map((t: any) => (
                        <div key={t.id} className="flex items-center gap-2 border-b py-2.5 last:border-none hover:bg-[var(--surface-2)] cursor-pointer" onClick={() => { setShowSearch(false); setSearch(''); router.push('/tournaments'); }}>
                          <div className="min-w-0">
                            <div className="text-[13px] font-semibold">{t.name}</div>
                            <div className="text-xs text-[var(--text-dim)]">{t.venue || t.date}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {results.logs.length > 0 && (
                    <div>
                      <div className="mb-1.5 px-1 text-sm font-bold">Recent Sessions</div>
                      {results.logs.map((l: any) => (
                        <div key={l.id} className="flex items-center gap-2 border-b py-2.5 last:border-none hover:bg-[var(--surface-2)] cursor-pointer" onClick={() => { setShowSearch(false); setSearch(''); router.push('/attendance'); }}>
                          <div className="min-w-0">
                            <div className="text-[13px] font-semibold">{l.boxerName}</div>
                            <div className="text-xs text-[var(--text-dim)]">{l.date} · {l.status}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
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
        <div>
          {profile?.photoURL ? (
            <img
              src={profile.photoURL}
              alt={profile.name}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-[13px] font-semibold text-white dark:bg-[var(--surface-2)] dark:text-[var(--text)]">
              {profile ? initials(profile.name) : '··'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
