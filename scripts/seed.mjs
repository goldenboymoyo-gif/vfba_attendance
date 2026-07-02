/**
 * Seeds Firebase Auth + Firestore with a starter admin account and a sample
 * tournament — so the app has a logged-in-able admin the first time you
 * deploy it.
 *
 * SETUP (one time):
 * 1. Firebase Console -> Project settings -> Service accounts ->
 *    "Generate new private key". Save the downloaded JSON as
 *    `service-account.json` in the project root (this file is git-ignored —
 *    NEVER commit it).
 * 2. Make sure Authentication -> Sign-in method -> Email/Password is enabled
 *    in the Firebase console.
 *
 * RUN:
 *   npm run seed
 *
 * The admin account below is the only default account. Coaches and boxers
 * must register themselves via the app's /register page.
 */

import { readFileSync } from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(readFileSync(new URL('../service-account.json', import.meta.url)));

initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth();
const db = getFirestore();

const DEFAULT_PASSWORD = 'VFBA2026!';

const ADMIN = { email: 'admin@vfba.academy', name: 'Admin', phone: '+263 77 900 0000' };

async function getOrCreateAuthUser(email, name) {
  try {
    return await auth.getUserByEmail(email);
  } catch {
    return auth.createUser({ email, password: DEFAULT_PASSWORD, displayName: name });
  }
}

async function run() {
  console.log('Seeding VFBA...');

  const adminUser = await getOrCreateAuthUser(ADMIN.email, ADMIN.name);
  await db.doc(`users/${adminUser.uid}`).set({
    name: ADMIN.name,
    email: ADMIN.email,
    role: 'admin',
    phone: ADMIN.phone,
  });
  console.log(`Admin ready: ${ADMIN.email}`);

  console.log('No coaches or boxers seeded — they register themselves via /register.');

  await db.collection('tournaments').add({
    name: 'Bulawayo Open Championship',
    venue: 'Bulawayo City Hall Arena',
    date: '2026-08-15',
    time: '09:00',
    weightClasses: ['Flyweight', 'Lightweight', 'Welterweight', 'Middleweight'],
    selectedBoxerIds: [],
    confirmedBoxerIds: [],
  });

  console.log('\nDone. Admin password: ' + DEFAULT_PASSWORD + ' (coaches and boxers register themselves)');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
