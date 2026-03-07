const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getFirebaseConfig() {
    console.log('Running firebase apps:sdkconfig web --json...');
    try {
        const raw = execSync('firebase apps:sdkconfig web --json', { encoding: 'utf8' });
        const parsed = JSON.parse(raw);

        // The CLI returns { result: { fileContents: "..." } } or similar
        if (parsed.result && parsed.result.fileContents) {
            // fileContents is a string with JSON inside
            const configStr = parsed.result.fileContents;
            return JSON.parse(configStr);
        }

        // Sometimes it's direct
        if (parsed.projectId) return parsed;

        throw new Error('Unexpected JSON structure from Firebase CLI');
    } catch (err) {
        console.error('Failed to get config via JSON:', err.message);
        // Fallback to non-json if needed, but let's try this first.
        throw err;
    }
}

function updateEnv(config) {
    const envPath = path.join(process.cwd(), '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');

    const mapping = {
        'VITE_FIREBASE_API_KEY': config.apiKey,
        'VITE_FIREBASE_AUTH_DOMAIN': config.authDomain,
        'VITE_FIREBASE_PROJECT_ID': config.projectId,
        'VITE_FIREBASE_STORAGE_BUCKET': config.storageBucket,
        'VITE_FIREBASE_MESSAGING_SENDER_ID': config.messagingSenderId,
        'VITE_FIREBASE_APP_ID': config.appId,
        'VITE_FIREBASE_MEASUREMENT_ID': config.measurementId,
    };

    for (const [key, value] of Object.entries(mapping)) {
        if (!value) continue;
        const regex = new RegExp(`^${key}=.*`, 'm');
        if (envContent.match(regex)) {
            envContent = envContent.replace(regex, `${key}=${value}`);
            console.log(`Updated ${key}`);
        } else {
            envContent += `\n${key}=${value}`;
            console.log(`Added ${key}`);
        }
    }

    // Also update Functions URL if project ID changed
    const functionsUrlRegex = /^VITE_FIREBASE_FUNCTIONS_URL=.*/m;
    const newFunctionsUrl = `VITE_FIREBASE_FUNCTIONS_URL=https://europe-west1-${config.projectId}.cloudfunctions.net`;
    envContent = envContent.replace(functionsUrlRegex, newFunctionsUrl);
    console.log('Updated VITE_FIREBASE_FUNCTIONS_URL');

    fs.writeFileSync(envPath, envContent);
}

try {
    const config = getFirebaseConfig();
    console.log('Config fetched:', config.projectId);
    updateEnv(config);
    console.log('.env updated successfully.');
} catch (err) {
    console.error('CRITICAL ERROR:', err.message);
    process.exit(1);
}
