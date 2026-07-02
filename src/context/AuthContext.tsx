'use client';

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
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
  const unsubDocRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);

      // Unsubscribe from previous profile listener
      if (unsubDocRef.current) {
        unsubDocRef.current();
        unsubDocRef.current = null;
      }

      if (user) {
        setLoading(true);
        unsubDocRef.current = onSnapshot(
          doc(db, 'users', user.uid),
          (snap) => {
            if (snap.exists()) {
              setProfile({ uid: user.uid, ...(snap.data() as Omit<UserProfile, 'uid'>) });
              setError(null);
            } else {
              setProfile(null);
              setError('No profile found for this account. Ask your coach to re-add you.');
            }
            setLoading(false);
          },
          (err) => {
            console.error(err);
            setError('Could not load your profile. Check your connection and try again.');
            setLoading(false);
          }
        );
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubDocRef.current) {
        unsubDocRef.current();
        unsubDocRef.current = null;
      }
    };
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
    const uid = profile?.uid;
    if (!uid) return;
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        setProfile({ uid, ...(snap.data() as Omit<UserProfile, 'uid'>) });
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
