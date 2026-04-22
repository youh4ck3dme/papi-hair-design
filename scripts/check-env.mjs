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

const PLACEHOLDER_TOKENS = [
    'your-api-key',
    'your-project-id',
    'your-sender-id',
    'your-app-id',
    'your-measurement-id',
    'your-app-check-site-key',
    'your-recaptcha-site-key',
    'your-app-check-debug-token',
];

// Detect CI / preview provider environment
const isCI = !!(process.env.CI || process.env.VERCEL || process.env.NETLIFY || process.env.GITHUB_ACTIONS);

function checkEnv() {
    console.log('🔍 Checking environment variables...');

    let missing = [];

    const isPlaceholder = (value) => {
        if (!value) return true;
        const normalized = String(value).trim().toLowerCase();
        return PLACEHOLDER_TOKENS.some((token) => normalized.includes(token));
    };

    const parseEnvContent = (envContent) => {
        const result = {};
        envContent.split(/\r?\n/).forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;
            const separatorIndex = trimmed.indexOf('=');
            if (separatorIndex === -1) return;
            const key = trimmed.slice(0, separatorIndex).trim();
            const value = trimmed.slice(separatorIndex + 1).trim();
            result[key] = value;
        });
        return result;
    };

    // Try to find .env file (local development)
    const envPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const envMap = parseEnvContent(envContent);
        REQUIRED_VARS.forEach(v => {
            if (!Object.prototype.hasOwnProperty.call(envMap, v) || isPlaceholder(envMap[v])) {
                missing.push(v);
            }
        });
    } else {
        // No .env file — check process.env (CI / preview providers may inject vars here)
        if (isCI) {
            console.log('🚀 CI environment detected — checking process.env...');
        } else {
            console.warn('⚠️  No .env file found. Checking process.env...');
        }
        REQUIRED_VARS.forEach(v => {
            if (isPlaceholder(process.env[v])) {
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
            console.warn('   ℹ️  This may be OK if they are set in CI or preview environment variables.');
            console.warn('   ℹ️  Continuing build...');
        } else {
            // Local development: fail hard so developer notices
            console.error('❌ Missing or placeholder Firebase environment variables:');
            missing.forEach(v => console.error(`   - ${v}`));
            console.error('   💡 Replace example values in .env with real Firebase SDK config.');
            process.exit(1);
        }
    } else {
        console.log('✅ Environment variables look good.');
    }
}

checkEnv();
