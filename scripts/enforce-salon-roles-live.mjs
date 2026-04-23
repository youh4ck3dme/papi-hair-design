import fs from "node:fs";
import path from "node:path";

function readEnvFile() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return {};
  const raw = fs.readFileSync(envPath, "utf8");
  const parsed = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    parsed[key] = value;
  }
  return parsed;
}

async function signInAndGetIdToken({ apiKey, email, password }) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`signInWithPassword failed: ${response.status} ${body}`);
  }

  const json = await response.json();
  if (!json.idToken) {
    throw new Error("signInWithPassword did not return idToken.");
  }

  return json.idToken;
}

async function callEnforceSalonRoles({ projectId, region, idToken, businessId }) {
  const url = `https://${region}-${projectId}.cloudfunctions.net/enforceSalonRoles`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      data: {
        business_id: businessId,
      },
    }),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.error) {
    throw new Error(`enforceSalonRoles failed: status=${response.status} body=${JSON.stringify(json)}`);
  }

  return json.result ?? json;
}

const envFile = readEnvFile();
const env = { ...envFile, ...process.env };

const ownerEmail = (
  env.PLAYWRIGHT_OWNER_EMAIL ||
  env.VITE_PRIMARY_OWNER_EMAIL ||
  env.PRIMARY_OWNER_EMAIL ||
  env.VITE_PAPI_EMAIL ||
  ""
).trim();
const ownerPassword = (env.PLAYWRIGHT_ROLE_PASSWORD || env.PLAYWRIGHT_ADMIN_PASSWORD || "").trim();
const apiKey = (env.VITE_FIREBASE_API_KEY || "").trim();
const projectId = (env.VITE_FIREBASE_PROJECT_ID || "").trim();
const region = (env.VITE_FIREBASE_FUNCTIONS_REGION || "europe-west1").trim();
const businessId = (env.PLAYWRIGHT_BUSINESS_ID || "papi-hair-design-main").trim();

if (!ownerEmail || !ownerPassword || !apiKey || !projectId) {
  console.error("Missing required config. Need owner credentials + VITE_FIREBASE_API_KEY + VITE_FIREBASE_PROJECT_ID.");
  process.exit(1);
}

try {
  const idToken = await signInAndGetIdToken({
    apiKey,
    email: ownerEmail,
    password: ownerPassword,
  });

  const result = await callEnforceSalonRoles({
    projectId,
    region,
    idToken,
    businessId,
  });

  console.log("enforceSalonRoles result:", JSON.stringify(result, null, 2));
} catch (error) {
  console.error("Failed to enforce salon roles:", error);
  process.exit(1);
}
