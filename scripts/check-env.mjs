import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REQUIRED_VARS = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
    'VITE_FIREBASE_MEASUREMENT_ID'
];

// Detect CI / Vercel environment
const isCI = !!(process.env.CI || process.env.VERCEL || process.env.NETLIFY || process.env.GITHUB_ACTIONS);

const EXPECTED_FIREBASE = {
    VITE_FIREBASE_PROJECT_ID: 'hairchainger-main-876665-176e8',
    VITE_FIREBASE_AUTH_DOMAIN: 'hairchainger-main-876665-176e8.firebaseapp.com',
    VITE_FIREBASE_STORAGE_BUCKET: 'hairchainger-main-876665-176e8.firebasestorage.app',
};

const DISALLOWED_FIREBASE_API_KEYS = new Set([
    'AIzaSyCvN-I4eNl3UPNW-zGdz9oEQHgVOqVG2iM',
]);

function parseEnvFile(content) {
    const values = {};
    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const separatorIndex = line.indexOf('=');
        if (separatorIndex === -1) continue;
        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim();
        values[key] = value;
    }
    return values;
}

function getEnvValues(envPath) {
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        return {
            source: '.env',
            values: parseEnvFile(envContent),
        };
    }

    const values = Object.fromEntries(
        REQUIRED_VARS.map((key) => [key, process.env[key]])
    );
    return {
        source: 'process.env',
        values,
    };
}

function validateFirebaseConfig(values) {
    const mismatches = [];

    for (const [key, expectedValue] of Object.entries(EXPECTED_FIREBASE)) {
        if ((values[key] ?? '').trim() !== expectedValue) {
            mismatches.push(`${key} must be ${expectedValue}`);
        }
    }

    const apiKey = (values.VITE_FIREBASE_API_KEY ?? '').trim();
    if (DISALLOWED_FIREBASE_API_KEYS.has(apiKey)) {
        mismatches.push('VITE_FIREBASE_API_KEY points to a blocked legacy Firebase project');
    }

    return mismatches;
}

function checkEnv() {
    console.log('🔍 Checking environment variables...');

    let missing = [];
    const envPath = path.resolve(__dirname, '../.env');
    const { source, values } = getEnvValues(envPath);

    if (source === 'process.env') {
        if (isCI) {
            console.log('🚀 CI environment detected — checking process.env...');
        } else {
            console.warn('⚠️  No .env file found. Checking process.env...');
        }
    }

    REQUIRED_VARS.forEach(v => {
        if (!values[v]) {
            missing.push(v);
        }
    });

    if (missing.length > 0) {
        if (isCI) {
            // On CI/Vercel: warn but don't block the build
            // Vite will pick up env vars from process.env during build
            console.warn('⚠️  Some environment variables not found in check-env script:');
            missing.forEach(v => console.warn(`   - ${v}`));
            console.warn('   ℹ️  This may be OK if they are set in Vercel dashboard.');
            console.warn('   ℹ️  Continuing build...');
        } else {
            // Local development: fail hard so developer notices
            console.error('❌ Missing required environment variables:');
            missing.forEach(v => console.error(`   - ${v}`));
            console.error('   💡 Run "cp .env.example .env" and fill in your values.');
            process.exit(1);
        }
    }

    const firebaseConfigIssues = validateFirebaseConfig(values);
    if (firebaseConfigIssues.length > 0) {
        console.error('❌ Firebase environment is pointing at the wrong project:');
        firebaseConfigIssues.forEach(issue => console.error(`   - ${issue}`));
        console.error(`   ℹ️  Checked source: ${source}`);
        process.exit(1);
    }

    console.log('✅ Environment variables look good.');
}

checkEnv();
