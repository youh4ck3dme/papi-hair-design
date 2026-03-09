const admin = require('firebase-admin');
const serviceAccount = require('C:\\Users\\42195\\Downloads\\hairchainger-main-876665-176e8-d3b21345e30c.json.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const businessId = "papi-hair-design-main";

async function check() {
    const snap = await db.collection('business_date_overrides')
        .where('business_id', '==', businessId)
        .limit(10)
        .get();

    if (snap.empty) {
        console.log('No documents found in business_date_overrides for this business.');
    } else {
        console.log(`Found ${snap.size} documents:`);
        snap.forEach(doc => {
            const data = doc.data();
            console.log(`- ${data.override_date}: ${data.label}`);
        });
    }
}

check().catch(console.error);
