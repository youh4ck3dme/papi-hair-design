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

function checkEnv() {
    console.log('🔍 Checking environment variables...');

    let missing = [];

    // Try to find .env file (local development)
    const envPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        REQUIRED_VARS.forEach(v => {
            if (!envContent.includes(`${v}=`)) {
                missing.push(v);
            }
        });
    } else {
        // No .env file — check process.env (Vercel injects vars here)
        if (isCI) {
            console.log('🚀 CI environment detected — checking process.env...');
        } else {
            console.warn('⚠️  No .env file found. Checking process.env...');
        }
        REQUIRED_VARS.forEach(v => {
            if (!process.env[v]) {
                missing.push(v);
            }
        });
    }

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
    } else {
        console.log('✅ Environment variables look good.');
    }
}

checkEnv();
