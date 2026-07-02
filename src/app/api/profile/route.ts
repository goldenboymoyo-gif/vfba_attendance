import { NextResponse } from 'next/server';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

function getAdminApp() {
  if (getApps().length) return getApps()[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) return initializeApp({ credential: cert(JSON.parse(raw)) });
  throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set.');
}

async function getAdmin() {
  const app = getAdminApp();
  return { adminAuth: getAuth(app), adminDb: getFirestore(app) };
}

export async function PUT(req: Request) {
  try {
    const { adminDb } = await getAdmin();
    const { uid, name, phone, photoURL } = await req.json();

    if (!uid) {
      return NextResponse.json({ error: 'UID is required.' }, { status: 400 });
    }

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (photoURL !== undefined) updateData.photoURL = photoURL;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
    }

    await adminDb.doc(`users/${uid}`).set(updateData, { merge: true });

    return NextResponse.json({ success: true, ...updateData });
  } catch (e: any) {
    console.error('PUT /api/profile error:', e);
    return NextResponse.json({ error: e.message || 'Failed to update profile.' }, { status: 500 });
  }
}
