'use client';

import { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

function resizeImage(file: File, maxDim: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas context unavailable')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

export default function SettingsPage() {
  const { profile } = useAuth();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setPhone(profile.phone || '');
      loadPhoto();
    }
  }, [profile]);

  async function loadPhoto() {
    if (!profile) return;
    try {
      const snap = await getDoc(doc(db, 'users', profile.uid));
      const data = snap.data();
      if (data?.photoURL) setPhotoURL(data.photoURL);
    } catch (e) {
      console.error('loadPhoto error:', e);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) { console.error('handlePhotoUpload: no file or profile'); return; }
    if (!profile.uid) { console.error('handlePhotoUpload: missing uid', profile); return; }
    setUploading(true);
    try {
      const dataUrl = await resizeImage(file, 400);
      await updateDoc(doc(db, 'users', profile.uid), { photoURL: dataUrl });
      setPhotoURL(dataUrl);
      toast('Profile photo updated.');
    } catch (e) {
      console.error('handlePhotoUpload error:', e);
      toast('Failed to upload photo. Check console (F12) for details.', false);
    } finally {
      setUploading(false);
    }
  }

  async function handleRemovePhoto() {
    if (!profile) { console.error('handleRemovePhoto: no profile'); return; }
    if (!profile.uid) { console.error('handleRemovePhoto: missing uid', profile); return; }
    try {
      await updateDoc(doc(db, 'users', profile.uid), { photoURL: '' });
      setPhotoURL('');
      toast('Profile photo removed.');
    } catch (e) {
      console.error('handleRemovePhoto error:', e);
      toast('Failed to remove photo. Check console (F12) for details.', false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) { console.error('handleSave: no profile'); return; }
    if (!name.trim()) { toast('Name is required.', false); return; }
    if (!profile.uid) { console.error('handleSave: missing uid', profile); return; }
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), { name: name.trim(), phone: phone.trim() });
      toast('Profile updated.');
    } catch (e) {
      console.error('handleSave error (profile.uid=' + profile.uid + '):', e);
      toast('Failed to save profile. Check console (F12) for details.', false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="mb-1 text-[12.5px] text-[var(--text-dim)]">Settings</div>
      <h1 className="font-display mb-5 text-xl font-bold tracking-tight sm:text-[23px]">Settings</h1>

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2">
        <form onSubmit={handleSave} className="card max-sm:!p-4">
          <div className="mb-4 font-display text-sm font-bold sm:text-[15px]">Profile</div>
          {profile && (
            <div className="mb-4 flex items-center gap-3">
              {photoURL ? (
                <img src={photoURL} alt="" className="h-13 w-13 rounded-full object-cover" style={{ height: 52, width: 52 }} />
              ) : (
                <div className="flex h-13 w-13 items-center justify-center rounded-full bg-ink text-base font-semibold text-white" style={{ height: 52, width: 52 }}>
                  {initials(profile.name)}
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate font-bold">{profile.name}</div>
                <div className="truncate text-xs text-[var(--text-dim)]">
                  {profile.role === 'admin' ? 'Admin' : profile.role === 'coach' ? 'Head Coach' : 'Boxer'} · {profile.email}
                </div>
              </div>
            </div>
          )}

          {profile && (
            <>
              <div className="mb-3">
                <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--text-dim)]">Profile Photo</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="rounded-xl bg-[var(--surface-2)] px-3 py-2 text-xs font-semibold sm:px-3.5"
                  >
                    {uploading ? 'Uploading...' : photoURL ? 'Change Photo' : 'Upload Photo'}
                  </button>
                  {photoURL && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="rounded-xl border px-2.5 py-2 text-xs font-semibold text-red sm:px-3"
                    >
                      Remove
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </div>
              </div>
              <div className="mb-3">
                <label htmlFor="name" className="mb-1.5 block text-[12.5px] font-semibold text-[var(--text-dim)]">Name</label>
                <input
                  id="name"
                  name="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border bg-[var(--surface-2)] px-3 py-2.5 text-xs outline-none focus:border-red sm:px-3.5 sm:py-3 sm:text-sm"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="phone" className="mb-1.5 block text-[12.5px] font-semibold text-[var(--text-dim)]">Phone</label>
                <input
                  id="phone"
                  name="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border bg-[var(--surface-2)] px-3 py-2.5 text-xs outline-none focus:border-red sm:px-3.5 sm:py-3 sm:text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-red py-2.5 text-xs font-semibold text-white hover:bg-red-dark disabled:opacity-60 sm:py-3 sm:text-sm"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
        </form>

        <div className="card max-sm:!p-4">
          <div className="mb-3 font-display text-sm font-bold sm:text-[15px]">Preferences</div>
          <div className="flex items-center justify-between border-b py-2.5">
            <span className="text-sm">Dark Mode</span>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-lg bg-[var(--surface-2)] px-3 py-1.5 text-xs font-semibold"
            >
              Toggle
            </button>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <label htmlFor="notifications" className="text-sm">Notifications</label>
            <input id="notifications" name="notifications" type="checkbox" defaultChecked className="h-4 w-4" />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
