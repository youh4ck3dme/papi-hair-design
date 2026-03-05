import { describe, it, expect } from "vitest";
import { hslLuminance, contrastRatio, WCAG_AA_NORMAL, WCAG_AA_LARGE, WCAG_AAA } from "./wcag";

/**
 * WCAG 2.1 kontrast testy pre všetky kritické farby z index.css
 * Spusti: npm test src/lib/wcag.test.ts
 */

describe("WCAG 2.1 — Light mode", () => {
  const bg = hslLuminance(40, 10, 98);     // --background
  const fg = hslLuminance(20, 15, 5);      // --foreground
  const mutedFg = hslLuminance(20, 12, 38); // --muted-foreground (opravená)
  const primary = hslLuminance(43, 70, 55);    // --primary
  const primaryFg = hslLuminance(20, 15, 5);   // --primary-foreground (dark, opravená)
  const sidebarBg = hslLuminance(20, 15, 5);  // --sidebar-background
  const sidebarFg = hslLuminance(40, 10, 90); // --sidebar-foreground

  it("foreground on background ≥ WCAG AAA (7:1)", () => {
    const ratio = contrastRatio(fg, bg);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
  });

  it("muted-foreground on background ≥ WCAG AA (4.5:1)", () => {
    const ratio = contrastRatio(mutedFg, bg);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
  });

  it("primary on primary-foreground (white) ≥ WCAG AA (4.5:1)", () => {
    const ratio = contrastRatio(primary, primaryFg);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
  });

  it("sidebar-foreground on sidebar-background ≥ WCAG AA (4.5:1)", () => {
    const ratio = contrastRatio(sidebarFg, sidebarBg);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
  });
});

describe("WCAG 2.1 — Dark mode", () => {
  const bg = hslLuminance(0, 0, 2);        // --background (dark)
  const fg = hslLuminance(40, 10, 95);     // --foreground (dark)
  const primary = hslLuminance(43, 80, 68); // --primary (opravená: 80% 68%)
  const mutedFg = hslLuminance(40, 8, 65);  // --muted-foreground (opravená: 65%)
  const confirmedBg = hslLuminance(142, 30, 45); // --calendar-confirmed
  const confirmedFg = hslLuminance(0, 0, 100);   // --calendar-confirmed-fg (white)

  it("foreground on background ≥ WCAG AAA (7:1)", () => {
    const ratio = contrastRatio(fg, bg);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
  });

  it("primary (gold) on background ≥ WCAG AA (4.5:1)", () => {
    const ratio = contrastRatio(primary, bg);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
  });

  it("muted-foreground on background ≥ WCAG AA (4.5:1)", () => {
    const ratio = contrastRatio(mutedFg, bg);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
  });

  it("calendar confirmed-fg (white) on confirmed color ≥ WCAG AA large (3:1)", () => {
    const ratio = contrastRatio(confirmedFg, confirmedBg);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_LARGE);
  });
});
