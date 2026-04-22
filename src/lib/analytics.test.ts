import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyAnalyticsConsent, initAnalytics } from "./analytics";

const analyticsMocks = vi.hoisted(() => ({
  getAnalytics: vi.fn(() => ({ __analytics: true })),
  isSupported: vi.fn(async () => true),
  setAnalyticsCollectionEnabled: vi.fn(),
  setConsent: vi.fn(),
}));

vi.mock("@/integrations/firebase/config", () => ({
  default: {},
}));

vi.mock("firebase/analytics", () => analyticsMocks);

describe("analytics helpers", () => {
  beforeEach(() => {
    vi.stubEnv("PROD", "true");
    vi.stubEnv("VITE_FIREBASE_MEASUREMENT_ID", "G-TEST123");
    analyticsMocks.getAnalytics.mockClear();
    analyticsMocks.isSupported.mockClear();
    analyticsMocks.setAnalyticsCollectionEnabled.mockClear();
    analyticsMocks.setConsent.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("initializes analytics with denied-by-default consent", async () => {
    await initAnalytics();

    expect(analyticsMocks.setConsent).toHaveBeenCalledWith(expect.objectContaining({
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    }));
    expect(analyticsMocks.getAnalytics).toHaveBeenCalledTimes(1);
    expect(analyticsMocks.setAnalyticsCollectionEnabled).toHaveBeenCalledWith(
      expect.any(Object),
      false,
    );
  });

  it("updates analytics consent and collection state", async () => {
    await applyAnalyticsConsent(true);

    expect(analyticsMocks.setConsent).toHaveBeenCalledWith(expect.objectContaining({
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    }));
    expect(analyticsMocks.setAnalyticsCollectionEnabled).toHaveBeenCalledWith(
      expect.any(Object),
      true,
    );
  });
});
