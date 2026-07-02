import { readFileSync } from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(readFileSync(new URL('../service-account.json', import.meta.url)));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function run() {
  const snap = await db.collection('boxers').get();
  console.log('boxers count:', snap.size);
  snap.forEach((d) => {
    console.log(d.id, JSON.stringify(d.data()));
  });
}

run().catch((e) => {
  console.error('Error listing boxers:', e);
  process.exit(1);
});
