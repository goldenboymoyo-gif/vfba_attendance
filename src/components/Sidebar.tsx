'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  Trophy,
  Calendar,
  BarChart3,
  Settings,
  Power,
  Shield,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const ADMIN_NAV = [
  { href: '/admin', label: 'Admin', icon: Shield },
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/attendance', label: 'Attendance', icon: CheckSquare },
  { href: '/boxers', label: 'Boxers', icon: Users },
  { href: '/analysis', label: 'Analysis', icon: BarChart3 },
  { href: '/tournaments', label: 'Tournaments', icon: Trophy },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const COACH_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/attendance', label: 'Attendance', icon: CheckSquare },
  { href: '/boxers', label: 'Boxers', icon: Users },
  { href: '/analysis', label: 'Analysis', icon: BarChart3 },
  { href: '/tournaments', label: 'Tournaments', icon: Trophy },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const BOXER_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/attendance', label: 'My Attendance', icon: CheckSquare },
  { href: '/boxers', label: 'Boxers', icon: Users },
  { href: '/analysis', label: 'Analysis', icon: BarChart3 },
  { href: '/tournaments', label: 'Tournaments', icon: Trophy },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const nav = profile?.role === 'admin' ? ADMIN_NAV : profile?.role === 'coach' ? COACH_NAV : BOXER_NAV;

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[99] bg-black/45 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed left-0 top-0 z-[100] flex h-screen w-[250px] shrink-0 -translate-x-full flex-col border-r bg-[var(--surface)] p-4 transition-transform lg:sticky lg:translate-x-0 ${
          open ? 'translate-x-0' : ''
        }`}
      >
        <div className="mb-5 flex items-center gap-2.5 px-2 pt-1.5">
          <img src="/logo.png" alt="VFBA" className="h-9 w-9 rounded-full shadow" />
          <div>
            <div className="font-display text-sm font-bold leading-tight">VFBA</div>
            <div className="text-[10.5px] tracking-wide text-[var(--text-dim)]">ATTENDANCE SYSTEM</div>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5">
          {nav.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] font-semibold transition-colors ${
                  active
                    ? 'bg-red text-white'
                    : 'text-[var(--text-dim)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]'
                }`}
              >
                <Icon size={17} strokeWidth={1.7} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t pt-3.5">
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] font-semibold text-[var(--text-dim)] hover:bg-[var(--surface-2)]"
          >
            <Power size={17} strokeWidth={1.7} />
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
