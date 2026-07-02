'use client';

import { useState, useRef, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { db, storage } from '@/lib/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

function resizeImage(file: File, maxDim: number, quality = 0.7): Promise<Blob> {
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
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      }, 'image/jpeg', quality);
    };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

function dataUrlFromBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function updateProfileDoc(uid: string, data: Record<string, any>) {
  const profileRef = doc(db, 'users', uid);
  await updateDoc(profileRef, data);
}

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const photoURL = profile?.photoURL || '';

  useEffect(() => {
    if (!profile) return;
    setName(profile.name || '');
    setPhone(profile.phone || '');
  }, [profile]);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploading(true);
    try {
      const dataUrl = await resizeImage(file, 400);
      // Try Storage upload first; if it fails (no billing/permission),
      // fall back to storing a compressed data URL directly in Firestore.
      try {
        const imgRef = storageRef(storage, `profilePhotos/${profile.uid}.jpg`);
        const blob = await resizeImage(file, 400);
        await uploadBytes(imgRef, blob);
        const downloadUrl = await getDownloadURL(imgRef);
        await updateProfileDoc(profile.uid, { photoURL: downloadUrl });
        await refreshProfile();
        toast('Profile photo uploaded.');
      } catch (e) {
        console.warn('Storage upload failed, falling back to Firestore:', e);
        // create a smaller fallback image to reduce Firestore storage size
        const fallbackBlob = await resizeImage(file, 240);
        const fallbackDataUrl = await dataUrlFromBlob(fallbackBlob);
        await updateProfileDoc(profile.uid, { photoURL: fallbackDataUrl });
        await refreshProfile();
        toast('Profile photo saved (fallback).');
      }
    } catch (e: any) {
      console.error('handlePhotoUpload error:', e);
      toast(e.message || 'Failed to upload photo.', false);
    } finally {
      setUploading(false);
    }
  }

  async function handleRemovePhoto() {
    if (!profile) return;
    try {
      // Try to delete from Storage if present
      try {
        const imgRef = storageRef(storage, `profilePhotos/${profile.uid}.jpg`);
        await deleteObject(imgRef);
      } catch (e) {
        // ignore storage delete errors
      }
      await updateProfileDoc(profile.uid, { photoURL: '' });
      await refreshProfile();
      toast('Profile photo removed.');
    } catch (e: any) {
      console.error('handleRemovePhoto error:', e);
      toast(e.message || 'Failed to remove photo.', false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedName) { toast('Name is required.', false); return; }
    setSaving(true);
    try {
      await updateProfileDoc(profile.uid, { name: trimmedName, phone: trimmedPhone });
      await refreshProfile();
      setName(trimmedName);
      setPhone(trimmedPhone);
      toast('Profile updated.');
    } catch (e: any) {
      console.error('handleSave error:', e);
      toast(e.message || 'Failed to save profile.', false);
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
                  {profile.role === 'admin' ? 'Admin' : profile.role === 'coach' ? 'Head Coach' : 'Boxer'} &middot; {profile.email}
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
