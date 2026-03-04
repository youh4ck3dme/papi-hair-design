/**
 * Pre-deploy environment variable validation tests.
 * Vitest reads .env automatically via Vite's env loader.
 * Run: npm test
 */
describe('Environment variables – povinné pre Supabase + salon', () => {
  it('VITE_SUPABASE_URL je platná Supabase URL', () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    expect(url, 'VITE_SUPABASE_URL chýba v .env').toBeTruthy();
    expect(url, 'Musí byť https://*.supabase.co').toMatch(/^https:\/\/.+\.supabase\.co$/);
  });

  it('VITE_SUPABASE_PUBLISHABLE_KEY je nastavený a neprázdny', () => {
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    expect(key, 'VITE_SUPABASE_PUBLISHABLE_KEY chýba v .env').toBeTruthy();
    expect(key.length, 'Kľúč je príliš krátky – pravdepodobne neplatný').toBeGreaterThan(20);
  });

  it('salon email env vars sú nastavené', () => {
    expect(import.meta.env.VITE_PAPI_EMAIL, 'VITE_PAPI_EMAIL chýba').toMatch(/@/);
    expect(import.meta.env.VITE_MISKA_EMAIL, 'VITE_MISKA_EMAIL chýba').toMatch(/@/);
    expect(import.meta.env.VITE_MATO_EMAIL, 'VITE_MATO_EMAIL chýba').toMatch(/@/);
  });
});
