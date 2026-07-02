import { readFileSync } from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(readFileSync(new URL('../service-account.json', import.meta.url)));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function run() {
  const id = 'sample-boxer-1';
  await db.doc(`boxers/${id}`).set({
    name: 'Sample Boxer',
    phone: '+263700000001',
    status: 'absent',
    checkInTime: null,
    checkOutTime: null,
    streak: 0,
    attendancePct: 0,
    goal: '',
    regNo: 'SAMPLE-001',
    age: 20,
    gender: 'Male',
    weightClass: 'Lightweight',
    emergencyContact: '',
    joined: new Date().toISOString().slice(0, 10),
    coachId: '',
    medicalNotes: '',
    achievements: [],
  });
  console.log('Inserted sample boxer');
}

run().catch((e) => { console.error(e); process.exit(1); });
