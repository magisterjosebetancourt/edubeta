const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json'); // Ensure you have this or use your environment config

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixIsaNames() {
  console.log('Starting ISA names fix...');
  
  // 1. Fetch all subjects to have a map
  const subjectsSnap = await db.collection('subjects').get();
  const subjectsMap = {};
  subjectsSnap.forEach(doc => {
    subjectsMap[doc.id] = doc.data().name;
  });
  
  console.log(`Found ${Object.keys(subjectsMap).length} subjects.`);

  // 2. Fetch all ISA records
  const isaSnap = await db.collection('isa_records').get();
  let updatedCount = 0;

  const batch = db.batch();
  let batchCount = 0;

  for (const doc of isaSnap.docs) {
    const data = doc.data();
    if (!data.subject_name && data.subject_id) {
      const realName = subjectsMap[data.subject_id];
      if (realName) {
        batch.update(doc.ref, { subject_name: realName });
        updatedCount++;
        batchCount++;
        
        if (batchCount === 500) {
          await batch.commit();
          console.log('Committed batch of 500...');
          batchCount = 0;
        }
      } else {
        console.warn(`Record ${doc.id} has unknown subject_id: ${data.subject_id}`);
      }
    }
  }

  if (batchCount >0) {
    await batch.commit();
  }

  console.log(`Finished! Updated ${updatedCount} records.`);
  process.exit(0);
}

fixIsaNames().catch(err => {
  console.error(err);
  process.exit(1);
});
