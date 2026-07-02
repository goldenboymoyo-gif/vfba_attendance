'use client';

import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/context/AuthContext';
import { useBoxers } from '@/hooks/useBoxers';
import { useAttendanceLogs } from '@/hooks/useAttendanceLogs';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title);

export default function AnalysisPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const { boxers, loading } = useBoxers();
  const { logs } = useAttendanceLogs(200);

  useEffect(() => {
    if (profile && profile.role !== 'coach') router.replace('/dashboard');
  }, [profile, router]);

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

  logs.forEach((l) => {
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
    logs.forEach((l) => {
      const d = l.date;
      byDate[d] = (byDate[d] || 0) + 1;
    });
    const sorted = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).slice(-14);
    return { labels: sorted.map(([d]) => d.slice(5)), data: sorted.map(([, c]) => c) };
  }, [logs]);

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

  return (
    <AppShell>
      <div className="mb-1 text-[12.5px] text-[var(--text-dim)]">Analysis</div>
      <h1 className="font-display mb-5 text-[23px] font-bold tracking-tight">Attendance Analysis</h1>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-[120px]" />)}
        </div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="card text-center">
              <div className="font-display text-[27px] font-bold">{total}</div>
              <div className="mt-1.5 text-[12.5px] font-semibold text-[var(--text-dim)]">Total Boxers</div>
            </div>
            <div className="card text-center">
              <div className="font-display text-[27px] font-bold" style={{ color: '#1D7A4C' }}>{present}</div>
              <div className="mt-1.5 text-[12.5px] font-semibold text-[var(--text-dim)]">Present Now</div>
            </div>
            <div className="card text-center">
              <div className="font-display text-[27px] font-bold" style={{ color: '#9A6B0C' }}>{late}</div>
              <div className="mt-1.5 text-[12.5px] font-semibold text-[var(--text-dim)]">Late Today</div>
            </div>
            <div className="card text-center">
              <div className="font-display text-[27px] font-bold">{logs.length}</div>
              <div className="mt-1.5 text-[12.5px] font-semibold text-[var(--text-dim)]">Total Logs</div>
            </div>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="card">
              <div className="mb-3 font-display text-[15px] font-bold">Today&apos;s Status Breakdown</div>
              <div className="mx-auto max-w-[240px]">
                <Doughnut data={statusData} options={{ cutout: '70%', plugins: { legend: { position: 'bottom' } } }} />
              </div>
            </div>

            <div className="card">
              <div className="mb-3 font-display text-[15px] font-bold">Attendance % by Day of Week</div>
              <Bar
                data={dayChartData}
                options={{
                  scales: { y: { beginAtZero: true, max: 100, grid: { color: 'var(--border)' } }, x: { grid: { display: false } } },
                  plugins: { legend: { display: false } },
                }}
              />
            </div>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="card">
              <div className="mb-3 font-display text-[15px] font-bold">Daily Check-in Trend (14 days)</div>
              <Line
                data={trendData}
                options={{
                  scales: { y: { beginAtZero: true, grid: { color: 'var(--border)' } }, x: { grid: { display: false } } },
                  plugins: { legend: { display: false } },
                }}
              />
            </div>

            <div className="card">
              <div className="mb-3 font-display text-[15px] font-bold">Top Attendance Rates</div>
              <Bar
                data={topBoxerData}
                options={{
                  indexAxis: 'y' as const,
                  scales: { x: { beginAtZero: true, max: 100, grid: { color: 'var(--border)' } }, y: { grid: { display: false } } },
                  plugins: { legend: { display: false } },
                }}
              />
            </div>
          </div>

          <div className="card">
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
