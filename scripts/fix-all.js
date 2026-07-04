// Run: node scripts/fix-all.js
// Creates missing boxer records for all registered boxers.
// Deletes the admin's duplicate boxer record.

const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.resolve(__dirname, '..', 'service-account.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

async function run() {
  const db = admin.firestore();

  // Get all users with role "boxer"
  const usersSnap = await db.collection('users').where('role', '==', 'boxer').get();
  const boxerUsers = usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() }));
  console.log(`Found ${boxerUsers.length} boxer users in users collection.`);

  // Get all existing boxer docs
  const boxersSnap = await db.collection('boxers').get();
  const existingBoxerIds = boxersSnap.docs.map((d) => d.id);
  console.log(`Found ${existingBoxerIds.length} existing boxer docs.`);

  // Find missing boxer docs
  let created = 0;
  for (const user of boxerUsers) {
    if (!existingBoxerIds.includes(user.uid)) {
      console.log(`Creating boxer doc for ${user.name} (${user.uid})...`);
      await db.doc(`boxers/${user.uid}`).set({
        name: user.name,
        regNo: '',
        age: 0,
        gender: '',
        weightClass: '',
        phone: user.phone || '',
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

  // Delete boxer docs that don't have a corresponding user with role "boxer"
  // (e.g., the admin's boxer doc created by setup-admin.js)
  let deleted = 0;
  for (const boxerId of existingBoxerIds) {
    const isBoxerUser = boxerUsers.some((u) => u.uid === boxerId);
    if (!isBoxerUser) {
      const boxerDoc = await db.doc(`boxers/${boxerId}`).get();
      if (boxerDoc.exists) {
        console.log(`Deleting boxer doc for non-boxer user: ${boxerDoc.data().name} (${boxerId})...`);
        await db.doc(`boxers/${boxerId}`).delete();
        deleted++;
      }
    }
  }

  console.log(`Created ${created} missing boxer docs.`);
  console.log(`Deleted ${deleted} non-boxer boxer docs.`);
  console.log('Done! Refresh the boxer roster page.');
  process.exit(0);
}

run().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
