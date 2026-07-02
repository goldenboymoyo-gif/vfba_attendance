'use client';

import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import CoachDashboard from '@/components/CoachDashboard';
import BoxerDashboard from '@/components/BoxerDashboard';

export default function DashboardPage() {
  const { profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (profile?.role === 'admin') router.replace('/admin');
  }, [profile, router]);

  if (profile?.role === 'admin') return null;

  return <AppShell>{profile?.role === 'coach' ? <CoachDashboard /> : <BoxerDashboard />}</AppShell>;
}
