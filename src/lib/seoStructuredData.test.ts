import { describe, expect, it } from "vitest";
import { buildHomeStructuredData, serializeStructuredData } from "./seoStructuredData";

describe("seoStructuredData", () => {
  it("builds a website and local business graph for the homepage", () => {
    const entries = buildHomeStructuredData();

    expect(entries).toHaveLength(2);
    expect(entries[0]?.["@type"]).toBe("WebSite");
    expect(entries[1]?.["@type"]).toBe("HairSalon");
  });

  it("serializes valid json-ld payloads", () => {
    const [, localBusiness] = buildHomeStructuredData();
    const json = serializeStructuredData(localBusiness);
    const parsed = JSON.parse(json);

    expect(parsed["@type"]).toBe("HairSalon");
    expect(parsed.address.addressLocality).toBe("Košice");
    expect(parsed.telephone).toBe("+421949459624");
  });
});
