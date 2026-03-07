/**
 * Pre-deploy environment variable validation tests.
 * Vitest reads .env automatically via Vite's env loader.
 * Run: npm test
 */
describe('Environment variables – povinné pre Firebase + salon', () => {
  it('VITE_FIREBASE_PROJECT_ID je nastavený', () => {
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
    expect(projectId, 'VITE_FIREBASE_PROJECT_ID chýba v .env').toBeTruthy();
    expect(projectId.length, 'Project ID je príliš krátky – pravdepodobne neplatný').toBeGreaterThan(3);
  });

  it('Firebase core env vars sú nastavené', () => {
    expect(import.meta.env.VITE_FIREBASE_API_KEY, 'VITE_FIREBASE_API_KEY chýba').toBeTruthy();
    expect(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, 'VITE_FIREBASE_AUTH_DOMAIN chýba').toContain("firebaseapp.com");
    expect(import.meta.env.VITE_FIREBASE_APP_ID, 'VITE_FIREBASE_APP_ID chýba').toBeTruthy();
  });

  it('salon email env vars sú nastavené', () => {
    expect(import.meta.env.VITE_PAPI_EMAIL, 'VITE_PAPI_EMAIL chýba').toMatch(/@/);
    expect(import.meta.env.VITE_MISKA_EMAIL, 'VITE_MISKA_EMAIL chýba').toMatch(/@/);
    expect(import.meta.env.VITE_MATO_EMAIL, 'VITE_MATO_EMAIL chýba').toMatch(/@/);
  });
});
