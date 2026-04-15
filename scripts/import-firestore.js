
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin (uses service account from environment or default project)
// In local dev, it often picks up credentials from 'firebase login'
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'hairchainger-main-876665-176e8'
    });
}

const db = admin.firestore();
const DATA_DIR = path.join(__dirname, '..', 'functions', 'migration_data');

const COLLECTIONS = [
    'profiles',
    'memberships',
    'businesses',
    'services',
    'service_subcategories',
    'employees',
    'employee_services',
    'appointments'
];

async function clearCollection(collectionName) {
    const col = db.collection(collectionName);
    for (;;) {
        const snap = await col.limit(400).get();
        if (snap.empty) break;
        let batch = db.batch();
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
    }
}

async function migrate() {
    console.log('🚀 Starting migration to Firestore (default) database...');

    for (const collectionName of COLLECTIONS) {
        const filePath = path.join(DATA_DIR, `${collectionName}.json`);

        if (!fs.existsSync(filePath)) {
            console.warn(`⚠️ Warning: ${filePath} not found, clearing ${collectionName} and skipping...`);
            await clearCollection(collectionName);
            continue;
        }

        console.log(`📦 Processing ${collectionName}...`);
        await clearCollection(collectionName);
        const rawData = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(rawData);

        if (!Array.isArray(data)) {
            console.error(`❌ Error: Data for ${collectionName} is not an array!`);
            continue;
        }

        const batch = db.batch();
        let count = 0;

        for (const item of data) {
            if (!item.id) {
                console.warn(`⚠️ Item in ${collectionName} missing ID, skipping...`);
                continue;
            }

            const docRef = db.collection(collectionName).doc(item.id);

            // Clean data for Firestore (remove undefined, fix dates if any)
            const cleanItem = { ...item };

            // Convert typical legacy timestamp strings to JS Dates (Firestore will handle as Timestamp)
            ['created_at', 'updated_at', 'start_at', 'end_at'].forEach(key => {
                if (cleanItem[key] && typeof cleanItem[key] === 'string') {
                    cleanItem[key] = admin.firestore.Timestamp.fromDate(new Date(cleanItem[key]));
                }
            });

            batch.set(docRef, cleanItem);
            count++;

            // Firebase batch limit is 500
            if (count % 400 === 0) {
                await batch.commit();
                batch = db.batch();
                console.log(`✅ Committed 400 items to ${collectionName}...`);
            }
        }

        if (count % 400 !== 0) {
            await batch.commit();
        }
        console.log(`✨ Successfully migrated ${count} items to ${collectionName}.`);
    }

    console.log('🏁 Migration complete!');
}

migrate().catch(err => {
    console.error('💥 Migration failed:', err);
    process.exit(1);
});
