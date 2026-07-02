'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserProfile } from '@/lib/types';

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists()) {
            setProfile({ uid: user.uid, ...(snap.data() as Omit<UserProfile, 'uid'>) });
          } else {
            // Auth account exists but no Firestore profile — shouldn't normally
            // happen if boxers/coaches are created via the seed script.
            setProfile(null);
            setError('No profile found for this account. Ask your coach to re-add you.');
          }
        } catch (e) {
          console.error(e);
          setError('Could not load your profile. Check your connection and try again.');
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function signIn(email: string, password: string) {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e: any) {
      const msg =
        e?.code === 'auth/invalid-credential' || e?.code === 'auth/wrong-password' || e?.code === 'auth/user-not-found'
          ? 'Incorrect email or password.'
          : 'Sign-in failed. Please try again.';
      setError(msg);
      throw e;
    }
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  async function refreshProfile() {
    const current = profile;
    if (!current?.uid) return;
    try {
      const snap = await getDoc(doc(db, 'users', current.uid));
      if (snap.exists()) {
        setProfile({ uid: current.uid, ...(snap.data() as Omit<UserProfile, 'uid'>) });
      }
    } catch (e) {
      console.error('refreshProfile error:', e);
    }
  }

  return (
    <AuthContext.Provider value={{ firebaseUser, profile, loading, error, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
