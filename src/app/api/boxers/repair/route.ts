import { NextResponse } from 'next/server';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

function getAdminApp() {
  if (getApps().length) return getApps()[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    const sanitized = raw.replace(/\r?\n/g, '');
    return initializeApp({ credential: cert(JSON.parse(sanitized)) });
  }
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
    } catch {
      // ignore
    }
  }
  throw new Error('FIREBASE_SERVICE_ACCOUNT not set and no service-account.json found.');
}

async function getAdmin() {
  const app = getAdminApp();
  return { adminAuth: getAuth(app), adminDb: getFirestore(app) };
}

export async function POST() {
  try {
    const { adminDb } = await getAdmin();
    const usersSnap = await adminDb.collection('users').where('role', '==', 'boxer').get();
    const boxerIds = usersSnap.docs.map((d) => d.id);

    let created = 0;
    const batch = adminDb.batch();

    for (const uid of boxerIds) {
      const boxerDoc = await adminDb.doc(`boxers/${uid}`).get();
      if (!boxerDoc.exists) {
        const userData = usersSnap.docs.find((d) => d.id === uid)?.data();
        batch.set(adminDb.doc(`boxers/${uid}`), {
          name: userData?.name || '',
          regNo: '',
          age: 0,
          gender: '',
          weightClass: '',
          phone: userData?.phone || '',
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
        created++;
      }
    }

    if (created > 0) await batch.commit();
    return NextResponse.json({ created });
  } catch (e: any) {
    console.error('Repair error:', e);
    return NextResponse.json({ error: e.message || 'Repair failed.' }, { status: 500 });
  }
}
