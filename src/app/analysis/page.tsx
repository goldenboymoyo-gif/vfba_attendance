'use client';

import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/context/AuthContext';
import { useBoxers } from '@/hooks/useBoxers';
import { useAttendanceLogs } from '@/hooks/useAttendanceLogs';
import { useMemo, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Filler } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Filler);

export default function AnalysisPage() {
  const { profile } = useAuth();
  const { boxers, loading } = useBoxers();
  const { logs } = useAttendanceLogs(200);
  const [daysRange, setDaysRange] = useState<number>(14);

  const present = boxers.filter((b) => b.status === 'in').length;
  const late = boxers.filter((b) => b.status === 'late').length;
  const absent = boxers.filter((b) => b.status === 'absent').length;
  const total = boxers.length;

  const statusData = {
    labels: ['Present', 'Late', 'Absent'],
    datasets: [{
      data: [present, late, absent],
      backgroundColor: ['#1D7A4C', '#9A6B0C', '#A61E22'],
      borderWidth: 0,
    }],
  };

  const dayOrder = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayCount: Record<string, number> = {};
  const dayTotals: Record<string, number> = {};
  dayOrder.forEach((d) => { dayCount[d] = 0; dayTotals[d] = 0; });

  // Filter logs to the selected date range (last `daysRange` days)
  const cutoff = useMemo(() => {
    const dt = new Date();
    dt.setDate(dt.getDate() - daysRange + 1);
    return dt;
  }, [daysRange]);

  const filteredLogs = logs.filter((l) => {
    const d = new Date(l.date);
    return d >= cutoff;
  });

  filteredLogs.forEach((l) => {
    const d = new Date(l.date);
    const day = dayOrder[d.getDay()];
    dayTotals[day] = (dayTotals[day] || 0) + 1;
    if (l.status === 'in' || l.status === 'out') dayCount[day] = (dayCount[day] || 0) + 1;
  });

  const dayLabels = dayOrder;
  const dayPresent = dayOrder.map((d) => dayCount[d] || 0);
  const dayPresentPct = dayOrder.map((d) => {
    const t = dayTotals[d] || 0;
    return t > 0 ? Math.round((dayCount[d] / t) * 100) : 0;
  });

  const dayChartData = {
    labels: dayLabels,
    datasets: [
      {
        label: 'Attendance % by Day',
        data: dayPresentPct,
        backgroundColor: '#A61E22',
        borderRadius: 6,
      },
    ],
  };

  const sortedByAttendance = useMemo(() => {
    return [...boxers].sort((a, b) => b.attendancePct - a.attendancePct).slice(0, 10);
  }, [boxers]);

  const topBoxerData = {
    labels: sortedByAttendance.map((b) => b.name.split(' ')[0]),
    datasets: [{
      label: 'Attendance %',
      data: sortedByAttendance.map((b) => b.attendancePct),
      backgroundColor: sortedByAttendance.map((_, i) =>
        i === 0 ? '#A67C2E' : i < 3 ? '#A61E22' : '#726A63'
      ),
      borderRadius: 6,
    }],
  };

  const topStreaks = useMemo(() => {
    return [...boxers].sort((a, b) => b.streak - a.streak).slice(0, 5);
  }, [boxers]);

  const logsByDate = useMemo(() => {
    const byDate: Record<string, number> = {};
    filteredLogs.forEach((l) => {
      const d = l.date;
      byDate[d] = (byDate[d] || 0) + 1;
    });
    const sorted = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b));
    // keep last `daysRange` labels if available
    const sliceStart = Math.max(0, sorted.length - daysRange);
    const sliced = sorted.slice(sliceStart);
    return { labels: sliced.map(([d]) => d.slice(5)), data: sliced.map(([, c]) => c) };
  }, [filteredLogs, daysRange]);

  const trendData = {
    labels: logsByDate.labels,
    datasets: [{
      label: 'Daily Check-ins',
      data: logsByDate.data,
      borderColor: '#A61E22',
      backgroundColor: 'rgba(166,30,34,.10)',
      fill: true,
      tension: 0.3,
      pointRadius: 3,
      pointBackgroundColor: '#A61E22',
    }],
  };

  // Resolve CSS vars for chart colors (ensures good contrast in dark mode)
  function cssVar(name: string, fallback: string) {
    if (typeof window === 'undefined') return fallback;
    const v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (v || fallback).trim();
  }
  const cssText = cssVar('--text', '#111');
  const cssTextDim = cssVar('--text-dim', '#726A63');
  const cssBorder = cssVar('--border', 'rgba(28,25,23,0.09)');

  return (
    <AppShell>
      <div className="mb-1 text-[12.5px] text-[var(--text-dim)]">Analysis</div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h1 className="font-display text-xl font-bold tracking-tight sm:text-[23px]">Attendance Analysis</h1>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[var(--text-dim)] sm:text-sm">Range:</span>
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDaysRange(d)}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold sm:px-3 sm:text-sm ${daysRange === d ? 'bg-red text-white' : 'bg-[var(--surface-2)] text-[var(--text-dim)]'}`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton h-[140px]" />)}
        </div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="card p-4">
              <div className="text-sm text-[var(--text-dim)]">Total Boxers</div>
              <div className="mt-2 font-display text-2xl font-bold">{total}</div>
            </div>
            <div className="card p-4">
              <div className="text-sm text-[var(--text-dim)]">Checked In</div>
              <div className="mt-2 font-display text-2xl font-bold" style={{ color: '#1D7A4C' }}>{present}</div>
            </div>
            <div className="card p-4">
              <div className="text-sm text-[var(--text-dim)]">Late Today</div>
              <div className="mt-2 font-display text-2xl font-bold" style={{ color: '#9A6B0C' }}>{late}</div>
            </div>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="card col-span-2 p-4">
              <div className="mb-3 font-display text-[15px] font-bold">Daily Check-in Trend ({daysRange} days)</div>
              <div className="h-64">
                <Line
                  data={trendData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: { beginAtZero: true, grid: { color: cssBorder }, ticks: { color: cssTextDim } },
                      x: { grid: { display: false }, ticks: { color: cssTextDim } },
                    },
                    plugins: { legend: { display: false, labels: { color: cssText } } },
                  }}
                />
              </div>
            </div>

            <div className="card p-4">
              <div className="mb-3 font-display text-[15px] font-bold">Status Breakdown</div>
              <div className="mx-auto max-w-[240px]">
                <Doughnut
                  data={statusData}
                  options={{
                    cutout: '70%',
                    plugins: { legend: { position: 'bottom', labels: { color: cssText } } },
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="card p-4">
              <div className="mb-3 font-display text-[15px] font-bold">Attendance % by Day</div>
              <div className="h-56">
                <Bar
                  data={dayChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true, max: 100, grid: { color: cssBorder }, ticks: { color: cssTextDim } }, x: { grid: { display: false }, ticks: { color: cssTextDim } } },
                    plugins: { legend: { display: false, labels: { color: cssText } } },
                  }}
                />
              </div>
            </div>

            <div className="card p-4">
              <div className="mb-3 font-display text-[15px] font-bold">Top Attendance Rates</div>
              <div className="h-56">
                <Bar
                  data={topBoxerData}
                  options={{
                    indexAxis: 'y' as const,
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { x: { beginAtZero: true, max: 100, grid: { color: cssBorder }, ticks: { color: cssTextDim } }, y: { grid: { display: false }, ticks: { color: cssTextDim } } },
                    plugins: { legend: { display: false, labels: { color: cssText } } },
                  }}
                />
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="mb-3 font-display text-[15px] font-bold">Top Streaks</div>
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="border-b text-left text-[11.5px] uppercase tracking-wide text-[var(--text-dim)]">
                  <th className="px-2 py-2">#</th>
                  <th className="px-2 py-2">Boxer</th>
                  <th className="px-2 py-2">Streak</th>
                  <th className="px-2 py-2">Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {topStreaks.map((b, i) => (
                  <tr key={b.id} className="border-b last:border-none">
                    <td className="px-2 py-2.5 font-bold">{i + 1}</td>
                    <td className="px-2 py-2.5">{b.name}</td>
                    <td className="px-2 py-2.5 font-semibold" style={{ color: '#A61E22' }}>{b.streak} days</td>
                    <td className="px-2 py-2.5">{b.attendancePct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AppShell>
  );
}
