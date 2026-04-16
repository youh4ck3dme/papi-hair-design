import { expect, test, type Page } from "@playwright/test";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const ENABLE_SERVICE_AUDIT_E2E = process.env.PLAYWRIGHT_ENABLE_SERVICE_AUDIT_E2E === "1";
const STAGING_ADMIN_EMAIL = process.env.PLAYWRIGHT_STAGING_ADMIN_EMAIL?.trim();
const STAGING_ADMIN_PASSWORD = process.env.PLAYWRIGHT_STAGING_ADMIN_PASSWORD?.trim();
const STAGING_BUSINESS_ID = process.env.PLAYWRIGHT_STAGING_BUSINESS_ID?.trim();
const LIVE_BUSINESS_ID = "papi-hair-design-main";

if (ENABLE_SERVICE_AUDIT_E2E) {
  if (!STAGING_ADMIN_EMAIL || !STAGING_ADMIN_PASSWORD || !STAGING_BUSINESS_ID) {
    throw new Error(
      "PLAYWRIGHT_STAGING_ADMIN_EMAIL, PLAYWRIGHT_STAGING_ADMIN_PASSWORD and PLAYWRIGHT_STAGING_BUSINESS_ID are required when PLAYWRIGHT_ENABLE_SERVICE_AUDIT_E2E=1.",
    );
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error(
      "GOOGLE_APPLICATION_CREDENTIALS must point to a Firebase Admin SDK JSON file when PLAYWRIGHT_ENABLE_SERVICE_AUDIT_E2E=1.",
    );
  }

  if (STAGING_BUSINESS_ID === LIVE_BUSINESS_ID) {
    throw new Error(
      "Refusing to run service audit E2E against the live business. Set PLAYWRIGHT_STAGING_BUSINESS_ID to an isolated staging business.",
    );
  }
}

type AuditAction = "create" | "update" | "reorder" | "delete";

interface MembershipRecord {
  business_id?: string;
  role?: string;
}

interface ServiceSubcategoryRecord {
  id: string;
  name_sk: string;
  sort_order: number | null;
}

interface AuditRecord {
  id: string;
  action: AuditAction;
  subcategory_id: string | null;
  changed_fields: string[];
  created_at: string | null;
}

const adminApp =
  getApps()[0] ??
  initializeApp({
    credential: applicationDefault(),
  });

const adminAuth = getAdminAuth(adminApp);
const adminDb = getFirestore(adminApp);

function roleRank(role: string | undefined) {
  switch (role) {
    case "owner":
      return 0;
    case "admin":
      return 1;
    case "employee":
      return 2;
    case "customer":
      return 3;
    default:
      return 4;
  }
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function dismissCookieConsent(page: Page) {
  const cookieAccept = page.locator('button:has-text("Prijať všetko")');
  await cookieAccept.waitFor({ state: "visible", timeout: 4_000 }).catch(() => {});
  if (await cookieAccept.isVisible().catch(() => false)) {
    await cookieAccept.click({ force: true }).catch(async () => {
      await cookieAccept.evaluate((element) => (element as HTMLButtonElement).click());
    });
  }
}

async function ensureStagingMembership(email: string, expectedBusinessId: string) {
  const user = await adminAuth.getUserByEmail(email);
  const membershipsSnap = await adminDb
    .collection("memberships")
    .where("profile_id", "==", user.uid)
    .get();

  const memberships = membershipsSnap.docs.map((membership) => membership.data() as MembershipRecord);
  if (memberships.length === 0) {
    throw new Error(`No memberships found for staging user ${email}.`);
  }

  const activeMembership = [...memberships].sort((a, b) => {
    const byRole = roleRank(a.role) - roleRank(b.role);
    if (byRole !== 0) return byRole;

    const preferredA = a.business_id === LIVE_BUSINESS_ID ? 0 : 1;
    const preferredB = b.business_id === LIVE_BUSINESS_ID ? 0 : 1;
    if (preferredA !== preferredB) return preferredA - preferredB;

    return String(a.business_id ?? "").localeCompare(String(b.business_id ?? ""));
  })[0];

  if (activeMembership.business_id !== expectedBusinessId) {
    throw new Error(
      `Staging user ${email} resolves to business ${activeMembership.business_id ?? "unknown"}, expected ${expectedBusinessId}. Use a dedicated staging-only admin account.`,
    );
  }
}

async function loginAsStagingAdmin(page: Page) {
  await page.goto("/auth");
  await expect(page.getByTestId("auth-page")).toBeVisible({ timeout: 15_000 });
  await dismissCookieConsent(page);

  await page.getByTestId("auth-email-input").fill(STAGING_ADMIN_EMAIL!);
  await page.locator('input[type="password"]').fill(STAGING_ADMIN_PASSWORD!);
  await page.getByTestId("auth-login-btn").click();

  const reachedTarget = await Promise.race([
    page.waitForURL(/\/(admin|bootstrap)/, { timeout: 25_000 }).then(() => true).catch(() => false),
    page
      .getByRole("heading", { name: /Admin Bootstrap/i })
      .waitFor({ state: "visible", timeout: 25_000 })
      .then(() => true)
      .catch(() => false),
  ]);

  expect(reachedTarget).toBe(true);

  if (page.url().includes("/bootstrap")) {
    const activateButton = page.getByRole("button", { name: /Aktivovať Admin prístup/i });
    if (await activateButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await activateButton.click();
      await expect(page.getByText(/úspešne vytvorené|already_bootstrapped/i)).toBeVisible({
        timeout: 15_000,
      });
    }
  }
}

async function waitForSubcategoryByName(
  businessId: string,
  name: string,
): Promise<ServiceSubcategoryRecord> {
  await expect
    .poll(async () => {
      const snapshot = await adminDb
        .collection("service_subcategories")
        .where("business_id", "==", businessId)
        .get();

      return snapshot.docs.some((docSnap) => docSnap.data().name_sk === name);
    }, {
      timeout: 20_000,
      message: `Subcategory ${name} was not persisted in Firestore.`,
    })
    .toBe(true);

  const snapshot = await adminDb
    .collection("service_subcategories")
    .where("business_id", "==", businessId)
    .get();
  const match = snapshot.docs.find((docSnap) => docSnap.data().name_sk === name);

  if (!match) {
    throw new Error(`Subcategory ${name} disappeared before it could be read back.`);
  }

  const data = match.data();
  return {
    id: match.id,
    name_sk: data.name_sk,
    sort_order: typeof data.sort_order === "number" ? data.sort_order : null,
  };
}

async function listAuditRecords(businessId: string, subcategoryId: string): Promise<AuditRecord[]> {
  const snapshot = await adminDb
    .collection("service_subcategory_audit")
    .where("business_id", "==", businessId)
    .get();

  return snapshot.docs
    .map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        action: data.action as AuditAction,
        subcategory_id: typeof data.subcategory_id === "string" ? data.subcategory_id : null,
        changed_fields: Array.isArray(data.changed_fields)
          ? data.changed_fields.filter((field): field is string => typeof field === "string")
          : [],
        created_at: typeof data.created_at === "string" ? data.created_at : null,
      };
    })
    .filter((entry) => entry.subcategory_id === subcategoryId)
    .sort((a, b) => String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")));
}

async function waitForAuditAction(
  businessId: string,
  subcategoryId: string,
  action: AuditAction,
) {
  await expect
    .poll(async () => {
      const actions = await listAuditRecords(businessId, subcategoryId);
      return actions.some((entry) => entry.action === action);
    }, {
      timeout: 25_000,
      message: `Audit action ${action} was not written for subcategory ${subcategoryId}.`,
    })
    .toBe(true);
}

async function cleanupTempSubcategories(businessId: string, prefix: string) {
  const subcategoriesSnap = await adminDb
    .collection("service_subcategories")
    .where("business_id", "==", businessId)
    .get();

  const stagedSubcategories = subcategoriesSnap.docs.filter((docSnap) => {
    const data = docSnap.data();
    return typeof data.name_sk === "string" && data.name_sk.startsWith(prefix);
  });

  if (stagedSubcategories.length === 0) return;

  const subcategoryIds = new Set(stagedSubcategories.map((docSnap) => docSnap.id));
  const batch = adminDb.batch();

  stagedSubcategories.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });

  const auditSnap = await adminDb
    .collection("service_subcategory_audit")
    .where("business_id", "==", businessId)
    .get();

  auditSnap.docs.forEach((docSnap) => {
    const data = docSnap.data();
    if (typeof data.subcategory_id === "string" && subcategoryIds.has(data.subcategory_id)) {
      batch.delete(docSnap.ref);
    }
  });

  await batch.commit();
}

async function getManagedGroupHeadingTexts(page: Page) {
  return page.locator('[data-testid^="service-subcategory-group-"] h3').allTextContents();
}

test.describe("Service subcategory audit trail", () => {
  test.describe.configure({ timeout: 120_000 });

  test.skip(
    !ENABLE_SERVICE_AUDIT_E2E,
    "Set PLAYWRIGHT_ENABLE_SERVICE_AUDIT_E2E=1 with dedicated staging admin credentials and business id.",
  );

  test("creates, updates, reorders and deletes staging subcategories while writing audit entries", async ({
    page,
  }) => {
    const prefix = `E2E Audit ${Date.now()}`;
    const firstName = `${prefix} A`;
    const secondName = `${prefix} B`;
    const renamedSecondName = `${prefix} B Updated`;

    await ensureStagingMembership(STAGING_ADMIN_EMAIL!, STAGING_BUSINESS_ID!);
    await cleanupTempSubcategories(STAGING_BUSINESS_ID!, prefix);
    await loginAsStagingAdmin(page);

    await page.goto("/admin/services");
    await expect(page.getByTestId("admin-services-page")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Služby", exact: true })).toBeVisible();

    await page.getByTestId("create-subcategory-button").click();
    await page.getByTestId("subcategory-name-input").fill(firstName);
    await page.getByTestId("subcategory-save-button").click();
    await expect(page.getByText(firstName)).toBeVisible({ timeout: 10_000 });

    const firstSubcategory = await waitForSubcategoryByName(STAGING_BUSINESS_ID!, firstName);
    await waitForAuditAction(STAGING_BUSINESS_ID!, firstSubcategory.id, "create");

    await page.getByTestId("create-subcategory-button").click();
    await page.getByTestId("subcategory-name-input").fill(secondName);
    await page.getByTestId("subcategory-save-button").click();
    await expect(page.getByText(secondName)).toBeVisible({ timeout: 10_000 });

    const secondSubcategory = await waitForSubcategoryByName(STAGING_BUSINESS_ID!, secondName);
    await waitForAuditAction(STAGING_BUSINESS_ID!, secondSubcategory.id, "create");

    await page.getByTestId(`subcategory-edit-${secondSubcategory.id}`).click();
    await page.getByTestId("subcategory-name-input").fill(renamedSecondName);
    await page.getByTestId("subcategory-save-button").click();
    await expect(page.getByText(renamedSecondName)).toBeVisible({ timeout: 10_000 });

    await waitForAuditAction(STAGING_BUSINESS_ID!, secondSubcategory.id, "update");

    const beforeOrder = await getManagedGroupHeadingTexts(page);
    await page.getByTestId(`subcategory-move-up-${secondSubcategory.id}`).click();

    await expect
      .poll(async () => {
        const [firstCurrent, secondCurrent] = await Promise.all([
          waitForSubcategoryByName(STAGING_BUSINESS_ID!, firstName),
          waitForSubcategoryByName(STAGING_BUSINESS_ID!, renamedSecondName),
        ]);

        return (
          typeof firstCurrent.sort_order === "number" &&
          typeof secondCurrent.sort_order === "number" &&
          secondCurrent.sort_order < firstCurrent.sort_order
        );
      }, {
        timeout: 20_000,
        message: "Reorder did not persist new sort_order values.",
      })
      .toBe(true);

    await waitForAuditAction(STAGING_BUSINESS_ID!, secondSubcategory.id, "reorder");
    const afterOrder = await getManagedGroupHeadingTexts(page);
    expect(afterOrder).not.toEqual(beforeOrder);

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId(`subcategory-delete-${secondSubcategory.id}`).click();
    await expect(page.getByText(renamedSecondName)).not.toBeVisible({ timeout: 10_000 });
    await waitForAuditAction(STAGING_BUSINESS_ID!, secondSubcategory.id, "delete");

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId(`subcategory-delete-${firstSubcategory.id}`).click();
    await expect(page.getByText(firstName)).not.toBeVisible({ timeout: 10_000 });
    await waitForAuditAction(STAGING_BUSINESS_ID!, firstSubcategory.id, "delete");

    await cleanupTempSubcategories(STAGING_BUSINESS_ID!, prefix);
  });
});
