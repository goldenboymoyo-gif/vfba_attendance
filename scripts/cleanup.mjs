/**
 * Removes the old seeded coach account (coach@vfba.academy).
 * Run after switching to the admin + self-registration model.
 */
import { readFileSync } from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(readFileSync(new URL('../service-account.json', import.meta.url)));
initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth();
const db = getFirestore();

async function run() {
  try {
    const user = await auth.getUserByEmail('coach@vfba.academy');
    await db.doc(`users/${user.uid}`).delete();
    await auth.deleteUser(user.uid);
    console.log('Deleted old coach account: coach@vfba.academy');
  } catch (e) {
    console.log('No old coach account found (already removed).');
  }
}
run().catch(console.error);
