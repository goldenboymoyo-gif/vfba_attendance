import { NextResponse } from 'next/server';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

function getAdminApp() {
  if (getApps().length) return getApps()[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) return initializeApp({ credential: cert(JSON.parse(raw)) });

  // Local dev fallback: try reading a service-account.json file from the
  // project root or `server/` directory. This makes `npm run dev` and the
  // signup flow work without setting env vars locally.
  const candidates = [
    `${process.cwd()}/service-account.json`,
    `${process.cwd()}/server/service-account.json`,
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const rawFile = fs.readFileSync(p, 'utf8');
        return initializeApp({ credential: cert(JSON.parse(rawFile)) });
      }
    } catch (e) {
      // ignore and try next
    }
  }

  throw new Error('FIREBASE_SERVICE_ACCOUNT not set and no service-account.json found.');
}

async function getAdmin() {
  const app = getAdminApp();
  return { adminAuth: getAuth(app), adminDb: getFirestore(app) };
}

export async function POST(req: Request) {
  try {
    const { adminAuth, adminDb } = await getAdmin();
    const { name, email, regNo, age, gender, weightClass, phone, emergencyContact, medicalNotes, coachId } = await req.json();

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });
    }

    const defaultPassword = 'VFBA2026!';

    let uid;
    try {
      const existing = await adminAuth.getUserByEmail(email);
      uid = existing.uid;
    } catch {
      const user = await adminAuth.createUser({ email, password: defaultPassword, displayName: name });
      uid = user.uid;
    }

    await adminDb.doc(`users/${uid}`).set({
      name,
      email,
      role: 'boxer',
      phone: phone || '',
    }, { merge: true });

    await adminDb.doc(`boxers/${uid}`).set({
      name,
      regNo: regNo || '',
      age: age || 0,
      gender: gender || '',
      weightClass: weightClass || '',
      phone: phone || '',
      emergencyContact: emergencyContact || '',
      medicalNotes: medicalNotes || '',
      joined: new Date().toISOString().slice(0, 10),
      coachId: coachId || '',
      status: 'absent',
      checkInTime: null,
      checkOutTime: null,
      streak: 0,
      attendancePct: 0,
      goal: '',
      achievements: [],
    });

    return NextResponse.json({ uid, email, defaultPassword });
  } catch (e: any) {
    console.error('POST /api/boxers error:', e);
    return NextResponse.json({ error: e.message || 'Failed to create boxer.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { adminAuth, adminDb } = await getAdmin();
    const { uid } = await req.json();
    if (!uid) {
      return NextResponse.json({ error: 'Boxer UID is required.' }, { status: 400 });
    }

    await adminDb.doc(`boxers/${uid}`).delete();
    await adminDb.doc(`users/${uid}`).delete();

    try {
      await adminAuth.deleteUser(uid);
    } catch {
      // auth user might not exist or already be deleted
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('DELETE /api/boxers error:', e);
    return NextResponse.json({ error: e.message || 'Failed to delete boxer.' }, { status: 500 });
  }
}
