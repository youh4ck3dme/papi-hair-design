import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REQUIRED_VARS = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_PUBLISHABLE_KEY'
];

function checkEnv() {
    console.log('🔍 Checking environment variables...');

    // In Node.js during build/scripts, we usually check .env manually if not loaded by Vite
    // But this script can also be used to check process.env if loaded via dotenv

    let missing = [];

    // Try to find .env file
    const envPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        REQUIRED_VARS.forEach(v => {
            if (!envContent.includes(`${v}=`)) {
                missing.push(v);
            }
        });
    } else {
        console.warn('⚠️  No .env file found. Checking process.env...');
        REQUIRED_VARS.forEach(v => {
            if (!process.env[v]) {
                missing.push(v);
            }
        });
    }

    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:');
        missing.forEach(v => console.error(`   - ${v}`));
        process.exit(1);
    } else {
        console.log('✅ Environment variables look good.');
    }
}

checkEnv();
