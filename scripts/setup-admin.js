// Run: node scripts/setup-admin.js brightmoyo263@gmail.com "Bright Moyo"
// This creates the Firestore profile doc so you can sign in as admin.

const admin = require('firebase-admin');
const path = require('path');

const email = process.argv[2];
const name = process.argv[3] || email.split('@')[0];

if (!email) {
  console.log('Usage: node scripts/setup-admin.js <email> [name]');
  process.exit(1);
}

// Use the local service account file
const serviceAccount = require(path.resolve(__dirname, '..', 'service-account.json'));

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

async function run() {
  const auth = admin.auth();
  const db = admin.firestore();

  // Find the user by email
  let uid;
  try {
    const user = await auth.getUserByEmail(email);
    uid = user.uid;
    console.log(`Found user: ${uid}`);
  } catch {
    console.log(`User with email ${email} not found in Firebase Auth.`);
    console.log('First go to Firebase Console > Authentication > Add user.');
    process.exit(1);
  }

  // Check if profile already exists
  const doc = await db.doc(`users/${uid}`).get();
  if (doc.exists) {
    console.log(`Profile already exists. Updating role to "admin"...`);
    await db.doc(`users/${uid}`).update({ role: 'admin' });
  } else {
    console.log(`Creating admin profile...`);
    await db.doc(`users/${uid}`).set({
      name: name,
      email: email,
      role: 'admin',
      phone: '',
    });
  }

  // Also create a boxer doc if it doesn't exist (so they show in roster)
  const boxerDoc = await db.doc(`boxers/${uid}`).get();
  if (!boxerDoc.exists) {
    console.log(`Creating boxer record...`);
    await db.doc(`boxers/${uid}`).set({
      name: name,
      regNo: '',
      age: 0,
      gender: '',
      weightClass: '',
      phone: '',
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
  }

  console.log('Done! You can now sign in at https://vfba-attendance.vercel.app');
  process.exit(0);
}

run().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
