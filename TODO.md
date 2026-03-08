# 🛠️ PHD Booking System – Repair & Enhancement Blueprint

**Projekt:** PAPI HAIR DESIGN Booking System  
**Status:** 7.2/10 – Production READY s podmienkami  
**Analytical Date:** 8.3.2026 | **Last Updated:** [AUTO]  
**Zdravotný stav:** 🟡 CONDITIONAL (3–4 critical fixes required)

---

## 📊 DIAGNOSTIKA ZHRNUTIE

| Aspekt | Score | Status |
|--------|-------|--------|
| **Bezpečnosť** | 7/10 | 🔴 KRITICKÉ: .env v git, role bypass |
| **Kód & Logika** | 7/10 | ✅ Dobrá kvalita, TypeScript 90%+ |
| **Testy** | 4/10 | ❌ Coverage 0% min, bez admin testov |
| **Dokumentácia** | 6/10 | 🟡 Dobrá, chýbajú detaily |
| **Infraštruktúra** | 8/10 | ✅ Firebase rules výborné |
| **DevOps** | 7/10 | 🟡 CI OK, chýba CF deploy |

---

## 🔴 CRITICAL BLOCKERS (Musí byť fixnuté dnes)

### 1. **Exponované .env v Git Histórii** [1–2h]
- **Status:** ❌ BLOCKER
- **File:** `.env`, `.env.local`
- **Riešenie:** 
  ```bash
  # 1. Regenerovať všetky tokeny v Firebase + Vercel
  firebase console  # Re-generate API key
  vercel env pull   # Re-generate OIDC token
  
  # 2. Purge z git histórie
  git filter-branch --tree-filter 'rm -f .env .env.local' -- --all
  git push origin --force --all
  git push origin --force --tags
  
  # 3. Setup novú .env z .env.example
  cp .env.example .env
  # → vyplniť nové tokeny
  ```
- **Verification:**
  ```bash
  git log -p --all -- .env | head -5  # Nesmie existovať
  ```

---

### 2. **ProtectedRoute – Role Bypass (Employee v adminovi)** [45m]
- **Status:** ❌ SECURITY BUG
- **File:** `src/components/ProtectedRoute.tsx:24-26`
- **Problem:**
  ```typescript
  // ❌ CHYBNE:
  if (requireAdmin) {
    const hasAdmin = memberships.some((m) => 
      m.role === "owner" || m.role === "admin" || m.role === "employee"  // ← BUG!
    );
  }
  ```
- **Fix:**
  ```typescript
  // ✅ SPRÁVNE:
  if (requireAdmin) {
    const hasAdmin = memberships.some((m) => 
      m.role === "owner" || m.role === "admin"  // Remove "employee"
    );
  }
  ```
- **Verification:**
  ```bash
  npm run lint  # Musí prejsť
  npm run typecheck
  npm run test  # Nový test pre role check
  ```

---

### 3. **SMTP Hesla bez šifrovania v Firestore** [1.5–2h]
- **Status:** ❌ DATA BREACH RISK
- **File:** `functions/src/saveSmtpConfig.ts:67`
- **Problem:**
  ```typescript
  // ❌ CHYBNE – plaintext v Firestore:
  sanitized.pass = pass.slice(0, 500);
  ```
- **Fix (Migrate to Secret Manager):**
  ```bash
  # 1. Vytvoriť secret v Google Secret Manager
  gcloud secrets create smtp-password-production \
    --data-file=- <<< "your-smtp-password"
  
  # 2. Grant permissions (Firebase Functions service account)
  gcloud secrets add-iam-policy-binding smtp-password-production \
    --member="serviceAccount:YOUR_PROJECT@appspot.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
  ```
  
  ```typescript
  // functions/src/middleware/secrets.ts (NEW FILE)
  import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
  
  const client = new SecretManagerServiceClient();
  
  export async function getSmtpPassword(businessId: string): Promise<string> {
    const secretName = `projects/${process.env.GCLOUD_PROJECT}/secrets/smtp-password-${businessId}/versions/latest`;
    try {
      const [version] = await client.accessSecretVersion({ name: secretName });
      return version.payload?.data?.toString() || '';
    } catch (err) {
      console.error('Failed to access secret:', err);
      throw new Error('SMTP configuration error');
    }
  }
  ```
  
  ```typescript
  // functions/src/saveSmtpConfig.ts (UPDATED)
  import { getSmtpPassword } from './middleware/secrets';
  
  export async function saveSmtpConfig(req, res) {
    const { businessId, smtpConfig } = req.body;
    
    // Store encrypted in Firestore (zašifrované)
    await db.collection('smtpConfigs').doc(businessId).set({
      host: smtpConfig.host,
      port: smtpConfig.port,
      user: smtpConfig.user,
      useAuth: true,
      encrypted: true,  // Marker že heslo je v Secret Manager
      updated_at: FieldValue.serverTimestamp(),
    });
    
    // Store password in Secret Manager
    const secretName = `projects/${process.env.GCLOUD_PROJECT}/secrets/smtp-password-${businessId}/versions/latest`;
    const parent = `projects/${process.env.GCLOUD_PROJECT}`;
    
    try {
      await client.createSecret({
        parent,
        secretId: `smtp-password-${businessId}`,
        secret: {
          replication: { automatic: {} },
        },
      });
    } catch (e) {
      // Already exists, update instead
    }
    
    await client.addSecretVersion({
      parent: secretName.split('/versions/')[0],
      payload: { data: Buffer.from(smtpConfig.password) },
    });
  }
  ```
- **Verification:**
  ```bash
  npm run build  # functions
  gcloud functions deploy saveSmtpConfig  # Test deploy
  ```

---

### 4. **Test Credentials exponované v E2E** [1h]
- **Status:** ⚠️ HIGH
- **File:** `e2e/admin-calendar.spec.ts:17-18`
- **Problem:**
  ```typescript
  // ❌ HARDCODED:
  await page.getByTestId("auth-email-input").fill("owner@papihairdesign.sk");
  await page.locator('input[type="password"]').fill("PapiDemo2025!");
  ```
- **Fix:**
  ```bash
  # 1. Setup GitHub Secrets:
  # Repo Settings → Secrets → New:
  # TEST_ADMIN_EMAIL=owner@papihairdesign.sk
  # TEST_ADMIN_PASSWORD=your-secure-password
  ```
  
  ```typescript
  // e2e/admin-calendar.spec.ts
  const TEST_EMAIL = process.env.TEST_ADMIN_EMAIL || "owner@papihairdesign.sk";
  const TEST_PASSWORD = process.env.TEST_ADMIN_PASSWORD || "test123";
  
  test('Admin calendar login flow', async ({ page }) => {
    await page.goto('/papihairsalon2026');
    await page.getByTestId("auth-email-input").fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    // ... rest of test
  });
  ```

---

## 🟠 HIGH PRIORITY (Pred launchom)

### 5. **Firestore Query Limity (N+1 queries)** [1h]
- **Status:** ⚠️ PERFORMANCE RISK
- **File:** `src/pages/admin/AppointmentsPage.tsx:66`
- **Problem:**
  ```typescript
  // ❌ Bez limitu – môže načítať tisíce dokumentov:
  const apptsSnap = await getDocs(
    query(
      collection(db, "bookings"),
      where("business_id", "==", businessId)
    )
  );
  ```
- **Fix:**
  ```typescript
  // ✅ S limitom + pagination:
  const apptsSnap = await getDocs(
    query(
      collection(db, "bookings"),
      where("business_id", "==", businessId),
      limit(100)  // Pridať limit
    )
  );
  
  // Ak treba viac: implementovať pagination
  const nextQuery = query(
    collection(db, "bookings"),
    where("business_id", "==", businessId),
    limit(100),
    startAfter(lastDoc)  // Pagination cursor
  );
  ```
- **Search to fix:**
  ```bash
  grep -r "getDocs.*query" src/pages/admin/ --include="*.tsx"
  ```

---

### 6. **Cloud Functions – Rate Limiting** [2–2.5h]
- **Status:** ⚠️ DDoS RISK
- **File:** `functions/src/createPublicBooking.ts`
- **Solution (Firestore-based rate limit):**
  ```typescript
  // functions/src/middleware/rateLimit.ts (NEW FILE)
  import { HttpsError } from 'firebase-functions/v2/https';
  import { getFirestore } from 'firebase-admin/firestore';
  
  const db = getFirestore();
  const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
  const MAX_REQUESTS = 5;
  
  export async function checkRateLimit(identifier: string): Promise<void> {
    const key = `ratelimit_${identifier}`;
    const ref = db.collection('_ratelimits').doc(key);
    const now = Date.now();
    
    try {
      const result = await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(ref);
        
        if (!doc.exists) {
          transaction.set(ref, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
          return true;
        }
        
        const data = doc.data()!;
        if (now > data.resetTime) {
          // Window expired
          transaction.set(ref, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
          return true;
        }
        
        if (data.count >= MAX_REQUESTS) {
          return false;  // Limit exceeded
        }
        
        transaction.update(ref, { count: data.count + 1 });
        return true;
      });
      
      if (!result) {
        throw new HttpsError('resource-exhausted', `Rate limit exceeded. Max ${MAX_REQUESTS} requests per minute.`);
      }
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      console.error('Rate limit check error:', err);
      // Fail open (allow request if service is down)
    }
  }
  
  // Firestore Rules (firestore.rules):
  match /_ratelimits/{document=**} {
    allow read, write: false;  // Server-only
  }
  ```
  
  ```typescript
  // functions/src/createPublicBooking.ts
  import { checkRateLimit } from './middleware/rateLimit';
  
  export const createPublicBooking = onCall(
    { cors: true, region: 'europe-west1' },
    async (request) => {
      // Rate limit by IP (from X-Forwarded-For header)
      const ip = request.rawRequest?.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
      await checkRateLimit(ip);
      
      // ... rest of function
    }
  );
  ```

---

### 7. **Error Monitoring – Sentry Setup** [1–1.5h]
- **Status:** ⚠️ BLIND PRODUCTION
- **Problem:** Bez loggingu v produkcii
- **Solution:**
  
  ```bash
  # 1. Vytvoríť Sentry projekt
  # Signup: https://sentry.io
  # Create project: React + Node.js
  # Dostanete DSN
  ```
  
  ```typescript
  // src/main.tsx
  import * as Sentry from "@sentry/react";
  import { BrowserTracing } from "@sentry/tracing";
  
  if (import.meta.env.PROD) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.1,
      integrations: [
        new BrowserTracing(),
        new Sentry.Replay({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
  }
  ```
  
  ```typescript
  // functions/src/index.ts
  import * as Sentry from '@google-cloud/functions-framework';
  
  if (process.env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: 'production',
      tracesSampleRate: 0.1,
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
      ],
    });
  }
  ```
  
  ```bash
  # Add to .env
  VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
  ```
  
  ```bash
  # GitHub Secrets:
  SENTRY_DSN=https://...
  ```

---

### 8. **Test Coverage – Thresholds** [1–1.5h]
- **Status:** ⚠️ 0% MINIMUM (RISK!)
- **File:** `vitest.config.ts`
- **Current:**
  ```typescript
  coverage: {
    provider: 'v8',
    statements: 0,  // ❌ No minimum
    branches: 0,
    functions: 0,
    lines: 0,
  }
  ```
- **Fix:**
  ```typescript
  // vitest.config.ts
  export default defineConfig({
    test: {
      coverage: {
        provider: 'v8',
        all: true,
        statements: 60,  // 60% minimum
        branches: 50,
        functions: 60,
        lines: 60,
        reporter: ['text', 'json', 'html', 'lcov'],
        exclude: [
          'node_modules/',
          'dist/',
          'functions/',
          '**/*.d.ts',
          'e2e/',
        ],
      },
    },
  });
  ```
  
  ```bash
  # Run coverage check
  npm run test:coverage
  # Report: coverage/index.html
  ```

---

### 9. **Cloud Functions Deployment v CI/CD** [1–1.5h]
- **Status:** ⚠️ Manual deploy
- **File:** `.github/workflows/ci.yml` (alebo `.github/workflows/deploy.yml`)
- **Current:** Iba frontend deploy (Vercel)
- **Add (NEW STEP):**
  ```yaml
  # .github/workflows/deploy-functions.yml (NEW FILE)
  name: Deploy Cloud Functions
  
  on:
    push:
      branches: [main, staging]
      paths:
        - 'functions/**'
        - 'firestore.rules'
        - 'firestore.indexes.json'
  
  jobs:
    deploy:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        
        - name: Setup Node
          uses: actions/setup-node@v4
          with:
            node-version: '20'
        
        - name: Install Firebase CLI
          run: npm install -g firebase-tools
        
        - name: Install functions dependencies
          run: cd functions && npm install
        
        - name: Build functions
          run: cd functions && npm run build
        
        - name: Lint functions
          run: cd functions && npm run lint
        
        - name: Deploy to Firebase
          run: |
            firebase deploy \
              --token "${{ secrets.FIREBASE_TOKEN }}" \
              --project "${{ secrets.FIREBASE_PROJECT_ID }}" \
              --only functions,firestore
  ```

---

## 🟡 MEDIUM PRIORITY (Pred launchom, ale nie critical)

### 10. **JSDoc Comments na Cloud Functions** [1h]
- **File:** `functions/src/*.ts`
- **Add:**
  ```typescript
  /**
   * Creates a public booking from customer submission
   * @param request - The callable request containing booking data
   * @returns Booking confirmation with ID and timestamps
   * @throws HttpsError - Invalid data, rate limit, or database errors
   */
  export const createPublicBooking = onCall(...)
  ```

### 11. **Playwright Update** [30m]
- **File:** `package.json`
- **Current:** `@playwright/test@^1.58.2`
- **Update to:** `^1.60+`
  ```bash
  npm update @playwright/test
  npm run test:responsive  # Verify
  ```

### 12. **Firestore Query Pagination Helper** [1–1.5h]
- **New utility:** `src/lib/firestore/pagination.ts`
  ```typescript
  export type PaginationState = {
    lastDoc: DocumentSnapshot | null;
    hasMore: boolean;
  };
  
  export async function paginate(
    q: Query,
    pageSize: number = 100
  ): Promise<{ docs: any[], pagination: PaginationState }> {
    const snap = await getDocs(query(q, limit(pageSize + 1)));
    const docs = snap.docs.slice(0, pageSize);
    const hasMore = snap.docs.length > pageSize;
    const lastDoc = docs[docs.length - 1] || null;
    
    return {
      docs: docs.map(d => ({ id: d.id, ...d.data() })),
      pagination: { lastDoc, hasMore }
    };
  }
  ```

---

## 📝 VALIDATION CHECKLIST (Pred launchom)

```markdown
# Pre-Launch Checklist

## Security ✅
- [ ] `.env` purged from git history (`git log --all -- .env` returns nothing)
- [ ] All tokens regenerated in Firebase + Vercel
- [ ] ProtectedRoute fix deployed (role bypass fixed)
- [ ] SMTP passwords in Secret Manager (not Firestore)
- [ ] Firestore Rules reviewed and deployed
- [ ] CSP headers configured correctly
- [ ] Rate limiting deployed
- [ ] Test credentials in GitHub Secrets (not hardcoded)

## Performance ✅
- [ ] Firestore queries have limits (max 100 docs)
- [ ] Pagination implemented for list views
- [ ] No N+1 queries (check Network tab)
- [ ] Cloud Functions regions optimized (europe-west1)
- [ ] Bundle size < 250KB (check `npm run budget`)

## Testing ✅
- [ ] Unit tests coverage ≥ 60% (`npm run test:coverage`)
- [ ] E2E tests pass (`npm run test:responsive`)
- [ ] Admin flow tested (calendar, appointments, settings)
- [ ] Booking flow tested (public form)
- [ ] Offline sync tested (IndexedDB)

## Monitoring ✅
- [ ] Sentry configured and tested
- [ ] Error boundaries added
- [ ] Logging in Cloud Functions
- [ ] Health check endpoint (optional)

## Documentation ✅
- [ ] README.md updated
- [ ] Deployment guide ready
- [ ] API docs for Cloud Functions (JSDoc)
- [ ] Troubleshooting guide

## CI/CD ✅
- [ ] GitHub Secrets all configured
- [ ] Vercel deployment working
- [ ] Cloud Functions deployment automated
- [ ] Build artifacts generated
- [ ] Staging environment green

## Final ✅
- [ ] `npm run lint` → 0 errors
- [ ] `npm run typecheck` → 0 errors
- [ ] `npm run build` → success, output in `dist/`
- [ ] `npm run preview` → runs on port 4173
- [ ] Firebase emulators start successfully
- [ ] Test booking creation (end-to-end)
- [ ] Test admin login + calendar view
```

---

## 🚀 TIMELINE & ASSIGNMENT

| Phase | Tasks | Owner | Time | Deadline |
|-------|-------|-------|------|----------|
| **Critical** | 1, 2, 3, 4 | Dev/Backend | 4–5h | TODAY |
| **High** | 5, 6, 7, 8, 9 | Dev/DevOps | 7–8h | Tomorrow AM |
| **Medium** | 10, 11, 12 | Dev | 2–3h | Tomorrow PM |
| **Validation** | Checklist | QA/Dev | 2–3h | Tomorrow EOD |

**Total: 15–19 hours**  
**Target Launch:** Tuesday 10.3.2026

---

## 📞 RUNNING COMMANDS

```bash
# Install all dependencies
npm install
cd functions && npm install

# Predeploy checks
npm run lint          # ✅ Must pass
npm run typecheck     # ✅ Must pass
npm run test          # ✅ Must pass (+ 60% coverage)
npm run test:coverage # Review report in coverage/index.html
npm run build         # ✅ Must produce dist/

# Firebase local development
npm run emulators:start  # Terminal 1
npm run dev              # Terminal 2 (http://localhost:5678)

# E2E testing
npm run test:responsive  # All viewports + browsers

# Firebase deployment
firebase deploy --only firestore  # Deploy rules + indexes
cd functions && npm run build && firebase deploy --only functions
npm run build && firebase deploy --only hosting

# Verify deployment
firebase emulators:start --import=<backup>  # Test with prod data
```

---

## 🔗 RELATED DOCS

- **README.md** – Project overview + quick start
- **docs/CURRENT_PROJECT_STATE.md** – Architecture details
- **docs/DEVELOPMENT-SETUP.md** – Dev environment setup
- **docs/EMAIL-NOTIFICATIONS-DEPLOY.md** – Email config
- **docs/MIGRATION-FIREBASE.md** – Supabase → Firebase migration
- **e2e/playwright.config.ts** – E2E test config
- **functions/src/index.ts** – Cloud Functions entry
- **firestore.rules** – Security rules
- **firebase.json** – Hosting + Functions config

---

## 📌 AI HANDOFF NOTES

**Ak pokračuješ v projekte (AI):**

1. ✅ Prečítaj si túto TODO.md úplne
2. ✅ Skontroluj status jednotlivých bodov (find "Status:")
3. ✅ Sled [PRIORITY] pád: CRITICAL → HIGH → MEDIUM
4. ✅ Pre každý fix: Read code → Verify problem → Apply fix → Test
5. ✅ Po každom fixe: Commit s messagem podľa conventions
6. ✅ Pre deploy: Skontroluj VALIDATION CHECKLIST
7. ✅ V prípade nejasnosti: Skontroluj `docs/` priečinok

**Last successful state:**
- Main branch: Production build ✅
- Functions: Built and tested locally ✅
- E2E tests: Passing ✅
- Firestore: Rules deployed ✅

---

**Generated by:** Senior Diagnostic Agent  
**Version:** 1.0  
**Last Review:** [AUTO]  
**Status:** Active 🟢
