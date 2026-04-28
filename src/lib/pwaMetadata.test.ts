import { afterEach, describe, expect, it } from "vitest";

import { applyAdminPwaMetadata } from "./pwaMetadata";

describe("applyAdminPwaMetadata", () => {
  afterEach(() => {
    document.head.innerHTML = "";
    document.title = "";
  });

  it("switches admin manifest metadata and restores previous public values", () => {
    document.head.innerHTML = `
      <link rel="manifest" href="/site.webmanifest" />
      <meta name="theme-color" content="#C9A84C" />
      <meta name="apple-mobile-web-app-title" content="Papi Hair" />
    `;
    document.title = "PAPI Hair";

    const cleanup = applyAdminPwaMetadata();

    expect(document.title).toBe("PAPI Hair Design Admin");
    expect(document.head.querySelector('link[rel="manifest"]')).toHaveAttribute("href", "/manifest-admin.webmanifest");
    expect(document.head.querySelector('meta[name="theme-color"]')).toHaveAttribute("content", "#D6B25E");
    expect(document.head.querySelector('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute("content", "PAPI Admin");

    cleanup();

    expect(document.title).toBe("PAPI Hair");
    expect(document.head.querySelector('link[rel="manifest"]')).toHaveAttribute("href", "/site.webmanifest");
    expect(document.head.querySelector('meta[name="theme-color"]')).toHaveAttribute("content", "#C9A84C");
    expect(document.head.querySelector('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute("content", "Papi Hair");
  });
});
