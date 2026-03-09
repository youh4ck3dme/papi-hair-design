const admin = require('firebase-admin');
const serviceAccount = require('C:\\Users\\42195\\Downloads\\hairchainger-main-876665-176e8-d3b21345e30c.json.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const businessId = "papi-hair-design-main";

const holidays2026 = [
    { date: '2026-01-01', label: 'Deň vzniku Slovenskej republiky' },
    { date: '2026-01-06', label: 'Zjavenie Pána (Traja králi)' },
    { date: '2026-04-03', label: 'Veľký piatok' },
    { date: '2026-04-06', label: 'Veľkonočný pondelok' },
    { date: '2026-05-01', label: 'Sviatok práce' },
    { date: '2026-05-08', label: 'Deň víťazstva nad fašizmom' },
    { date: '2026-07-05', label: 'Sviatok svätého Cyrila a Metoda' },
    { date: '2026-08-29', label: 'Výročie SNP' },
    { date: '2026-09-01', label: 'Deň Ústavy Slovenskej republiky' },
    { date: '2026-09-15', label: 'Sedmibolestná Panna Mária' },
    { date: '2026-11-01', label: 'Sviatok všetkých svätých' },
    { date: '2026-11-17', label: 'Deň boja za slobodu a demokraciu' },
    { date: '2026-12-24', label: 'Štedrý deň' },
    { date: '2026-12-25', label: 'Prvý sviatok vianočný' },
    { date: '2026-12-26', label: 'Druhý sviatok vianočný' },
];

async function fillHolidays() {
    console.log('Starting to fill holidays...');
    const batch = db.batch();
    const collectionRef = db.collection('business_date_overrides');

    for (const h of holidays2026) {
        const docRef = collectionRef.doc();
        batch.set(docRef, {
            business_id: businessId,
            override_date: h.date,
            mode: 'closed',
            label: h.label,
            start_time: null,
            end_time: null,
            created_at: new Date().toISOString()
        });
        console.log(`Queued: ${h.date} - ${h.label}`);
    }

    await batch.commit();
    console.log('Successfully saved all holidays to Firestore.');
    process.exit(0);
}

fillHolidays().catch(err => {
    console.error('Error filling holidays:', err);
    process.exit(1);
});
