const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// Initialize Firebase Admin
initializeApp({
  credential: applicationDefault(),
});

const db = getFirestore();

async function addCreatedAtToAppointments() {
  const appointmentsRef = db.collection('appointments');
  const snapshot = await appointmentsRef.get();
  let updatedCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!data.createdAt) {
      await doc.ref.update({ createdAt: FieldValue.serverTimestamp() });
      updatedCount++;
      console.log(`Updated appointment ${doc.id} with createdAt.`);
    }
  }

  if (updatedCount === 0) {
    console.log('All appointments already have createdAt.');
  } else {
    console.log(`Added createdAt to ${updatedCount} appointments.`);
  }
}

addCreatedAtToAppointments().catch(console.error); 