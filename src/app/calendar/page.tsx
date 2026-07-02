'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { db } from '@/lib/firebase';
import { AppShell } from '@/components/AppShell';
import type { Tournament } from '@/lib/types';

function useTournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  useEffect(() => {
    const q = query(collection(db, 'tournaments'), orderBy('date'));
    const unsub = onSnapshot(q, (snap) => {
      setTournaments(snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as Omit<Tournament, 'id'>) })));
    });
    return unsub;
  }, []);
  return tournaments;
}

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const tournaments = useTournaments();

  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(startPad).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const monthName = first.toLocaleString('default', { month: 'long' });

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  function pad(n: number) { return n.toString().padStart(2, '0'); }

  function tournamentsOnDay(day: number) {
    const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
    return tournaments.filter(t => t.date === dateStr);
  }

  return (
    <AppShell>
      <div className="mb-1 text-[12.5px] text-[var(--text-dim)]">Calendar</div>

      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold tracking-tight sm:text-[23px]">
          {monthName} {year}
        </h1>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="flex h-9 w-9 items-center justify-center rounded-xl border bg-[var(--surface)] hover:bg-[var(--surface-2)]"
            aria-label="Previous month"
          >
            <ChevronLeft size={17} />
          </button>
          <button
            onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}
            className="rounded-xl border bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--surface-2)] sm:px-3.5 sm:py-2 sm:text-sm"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="flex h-9 w-9 items-center justify-center rounded-xl border bg-[var(--surface)] hover:bg-[var(--surface-2)]"
            aria-label="Next month"
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>

      <div className="card max-sm:!p-3">
        <div className="mb-1.5 grid grid-cols-7 gap-0.5 sm:mb-2 sm:gap-1.5">
          {dayNames.map((d) => (
            <div key={d} className="py-1 text-center text-[10px] font-bold text-[var(--text-dim)] sm:text-[11px]">
              <span className="hidden sm:inline">{d}</span>
              <span className="sm:hidden">{d.slice(0, 1)}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1.5">
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const dow = new Date(year, month, d).getDay();
            const off = dow === 0;
            const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const tDay = tournamentsOnDay(d);
            const hasTournament = tDay.length > 0;

            return (
              <div
                key={i}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-[10px] text-xs font-semibold sm:text-[12.5px] ${
                  off && !isToday ? 'opacity-30' : ''
                } ${
                  isToday
                    ? 'shadow-[0_0_0_2px_rgba(166,30,34,.2)] border-red'
                    : 'border-transparent'
                } border bg-[var(--surface-2)]`}
              >
                <span className={isToday ? 'text-red' : ''}>{d}</span>
                <div className="mt-0.5 flex gap-0.5">
                  {hasTournament && (
                    <span className="h-1.5 w-1.5 rounded-full bg-red sm:h-2 sm:w-2" />
                  )}
                </div>
                {hasTournament && (
                  <div className="absolute -bottom-1 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-[var(--surface)] px-2 py-0.5 text-[9px] font-semibold text-red shadow sm:block">
                    {tDay[0].name}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[var(--text-dim)] sm:mt-4 sm:text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#1D7A4C]" /> Training day
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-red" /> Tournament
          </div>
          <div>Sunday — no training</div>
        </div>
      </div>

      {tournaments.filter(t => {
        const tDate = new Date(t.date + 'T00:00:00');
        return tDate.getMonth() === month && tDate.getFullYear() === year;
      }).length > 0 && (
        <div className="mt-4">
          <h2 className="mb-3 font-display text-sm font-bold sm:text-[15px]">Tournaments this month</h2>
          <div className="flex flex-col gap-3">
            {tournaments.filter(t => {
              const tDate = new Date(t.date + 'T00:00:00');
              return tDate.getMonth() === month && tDate.getFullYear() === year;
            }).map(t => (
              <div key={t.id} className="card max-sm:!p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold">{t.name}</div>
                    <div className="mt-0.5 text-xs text-[var(--text-dim)]">
                      {t.venue} · {t.time}
                    </div>
                  </div>
                  <div className="shrink-0 rounded-lg bg-red/10 px-2.5 py-1 text-xs font-semibold text-red">
                    {new Date(t.date + 'T00:00:00').toLocaleDateString('default', { weekday: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
