'use client';

import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import CoachDashboard from '@/components/CoachDashboard';
import BoxerDashboard from '@/components/BoxerDashboard';

export default function DashboardPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (profile?.role === 'admin') router.replace('/admin');
  }, [profile, router]);

  if (profile?.role === 'admin') return null;

  if (loading || !profile) {
    return (
      <AppShell>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="skeleton h-[260px]" />
          <div className="skeleton h-[260px]" />
          <div className="skeleton h-[260px]" />
        </div>
      </AppShell>
    );
  }

  return <AppShell>{profile?.role === 'coach' ? <CoachDashboard /> : <BoxerDashboard />}</AppShell>;
}
