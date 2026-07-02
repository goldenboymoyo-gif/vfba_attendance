'use client';

import { useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';

export function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { firebaseUser, profile, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !firebaseUser) router.replace('/login');
  }, [loading, firebaseUser, router]);

  if (loading || !firebaseUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-red border-t-transparent" />
          <div className="text-sm text-[var(--text-dim)]">Loading VFBA…</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="card max-w-md text-center">
          <div className="mb-2 text-3xl">👋</div>
          <div className="mb-2 text-lg font-bold">Profile not found</div>
          <p className="mb-4 text-sm text-[var(--text-dim)]">
            Your account exists but your profile data is missing. This happens when an admin deletes your profile.
          </p>
          <p className="mb-4 text-sm text-[var(--text-dim)]">
            Ask your coach to re-add you, or{' '}
            <button onClick={() => signOut()} className="font-semibold text-red hover:underline">
              sign out
            </button>{' '}
            and register again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="min-w-0 flex-1">
        <Topbar onMenu={() => setSidebarOpen(true)} />
        <div className="p-4 pb-14 md:p-7">{children}</div>
      </div>
    </div>
  );
}
