'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

type RegisterRole = 'boxer' | 'coach';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<RegisterRole>('boxer');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uidRef = useRef<string | null>(null);

  async function createProfileFallback(uid: string) {
    const userRole = role === 'coach' ? 'coach' : 'boxer';
    // Firestore rules allow users to write their own users/{uid} doc
    await setDoc(doc(db, 'users', uid), {
      name,
      email,
      role: userRole,
      phone: phone || '',
    });
    // Create boxers doc too so they show up in the roster immediately
    if (userRole === 'boxer') {
      await setDoc(doc(db, 'boxers', uid), {
        name,
        regNo: '',
        age: 0,
        gender: '',
        weightClass: '',
        phone: phone || '',
        emergencyContact: '',
        medicalNotes: '',
        joined: new Date().toISOString().slice(0, 10),
        coachId: '',
        status: 'absent',
        checkInTime: null,
        checkOutTime: null,
        streak: 0,
        attendancePct: 0,
        goal: '',
        achievements: [],
      });
    }
    console.log('Profile created via client fallback for', uid);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Step 1: Create Firebase Auth user
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      uidRef.current = cred.user.uid;

      // Step 2: Write Firestore docs directly from client (bypasses broken Admin API)
      await createProfileFallback(cred.user.uid);

      router.replace('/dashboard');
    } catch (e: any) {
      if (e?.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Try signing in.');
      } else if (e?.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center p-6"
      style={{
        background:
          'radial-gradient(circle at 15% 15%, rgba(166,30,34,.12), transparent 45%), radial-gradient(circle at 85% 85%, rgba(166,124,46,.10), transparent 45%), var(--bg)',
      }}
    >
      <div className="grid w-full max-w-[960px] grid-cols-1 overflow-hidden rounded-[26px] border shadow-lg2 md:grid-cols-[1.05fr_1fr]">
        <div
          className="relative flex flex-col justify-between overflow-hidden p-5 text-white md:p-11"
          style={{
            background: 'linear-gradient(145deg, #7D171A 0%, #A61E22 40%, #8B1A1E 100%)',
          }}
        >
          <div className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: `
                linear-gradient(45deg, #fff 1px, transparent 1px),
                linear-gradient(-45deg, #fff 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
            }}
          />

          <div>
            <div className="flex items-center gap-3 md:gap-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-white/20 blur-md" />
                <img src="/logo.png" alt="VFBA" className="relative h-12 w-12 rounded-full border-2 border-white/30 shadow-xl sm:h-[70px] sm:w-[70px]" />
              </div>
              <div>
                <div className="font-display text-base font-extrabold leading-tight tracking-tight sm:text-2xl">
                  Victoria Falls
                  <br />
                  Boxing Academy
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[9px] uppercase tracking-[0.22em] text-white/60 sm:text-[11px]">
                  <span className="h-px w-4 bg-white/30" />
                  Est. 2013
                </div>
              </div>
            </div>
          </div>

          <div className="relative my-4 sm:my-12">
            <div className="mb-1 h-1 w-12 rounded-full bg-gold" />
            <h2 className="mt-2 font-display text-xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              Forge your
              <br />
              champion spirit.
            </h2>
            <p className="mt-2 max-w-[320px] text-xs leading-relaxed text-white/75 sm:text-[15px]">
              Join Zimbabwe's premier boxing academy. Track your training, set goals, and let your coaches guide you to greatness.
            </p>
          </div>

          <div className="relative hidden items-center justify-between border-t border-white/10 pt-5 sm:flex">
            <div className="flex gap-6 text-xs text-white/50">
              <div>
                <span className="font-bold text-white/80">150+</span>
                <span className="ml-1">Boxers</span>
              </div>
              <div>
                <span className="font-bold text-white/80">13 yrs</span>
                <span className="ml-1">Legacy</span>
              </div>
            </div>
            <div className="text-[11px] text-white/40">Victoria Falls, Zimbabwe</div>
          </div>
        </div>

        <div className="flex flex-col justify-center bg-[var(--surface)] p-8 md:p-11">
          <h1 className="mb-1 text-[22px] font-bold">Create account</h1>
          <p className="mb-6 text-[13.5px] text-[var(--text-dim)]">Register at VFBA</p>

          <form onSubmit={handleSubmit}>
            <div className="mb-4 flex gap-2 rounded-xl border bg-[var(--surface-2)] p-1">
              <button
                type="button"
                onClick={() => setRole('boxer')}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${role === 'boxer' ? 'bg-red text-white' : 'text-[var(--text-dim)]'}`}
              >
                Boxer
              </button>
              <button
                type="button"
                onClick={() => setRole('coach')}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${role === 'coach' ? 'bg-red text-white' : 'text-[var(--text-dim)]'}`}
              >
                Coach
              </button>
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--text-dim)]">Full Name</label>
              <input
                type="text"
                name="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Bright Moyo"
                className="w-full rounded-xl border bg-[var(--surface-2)] px-3.5 py-3 text-sm outline-none focus:border-red"
              />
            </div>
            <div className="mb-4">
              <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--text-dim)]">Email</label>
              <input
                type="email"
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border bg-[var(--surface-2)] px-3.5 py-3 text-sm outline-none focus:border-red"
              />
            </div>
            <div className="mb-4">
              <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--text-dim)]">Phone</label>
              <input
                type="tel"
                name="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+263 77 123 4567"
                className="w-full rounded-xl border bg-[var(--surface-2)] px-3.5 py-3 text-sm outline-none focus:border-red"
              />
            </div>
            <div className="mb-4">
              <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--text-dim)]">Password</label>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full rounded-xl border bg-[var(--surface-2)] px-3.5 py-3 text-sm outline-none focus:border-red"
              />
            </div>

            {error && <div className="mb-4 text-[12.5px] font-medium text-red">{error}</div>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-red py-3.5 font-semibold text-white transition-colors hover:bg-red-dark disabled:opacity-60"
            >
              {submitting ? 'Creating account...' : `Create ${role === 'coach' ? 'Coach' : 'Boxer'} Account ->`}
            </button>
          </form>

          <div className="mt-4 text-center text-[12.5px] text-[var(--text-dim)]">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-red hover:underline">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
