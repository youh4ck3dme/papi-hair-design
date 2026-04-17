import { describe, expect, it } from "vitest";
import { resolveEmployeePhotoUrl, resolveStaticEmployeePhotoUrl } from "./employeePhoto";

describe("employeePhoto", () => {
  it("maps known booking staff names to bundled public photos", () => {
    expect(resolveStaticEmployeePhotoUrl({ display_name: "Papi" })).toBe("/papi.webp");
    expect(resolveStaticEmployeePhotoUrl({ display_name: "Miska" })).toBe("/miska.webp");
    expect(resolveStaticEmployeePhotoUrl({ display_name: "Mato" })).toBe("/mato.webp");
  });

  it("supports diacritics and email local-part fallback", () => {
    expect(resolveStaticEmployeePhotoUrl({ display_name: "Miška" })).toBe("/miska.webp");
    expect(resolveStaticEmployeePhotoUrl({ display_name: "Maťo" })).toBe("/mato.webp");
    expect(resolveStaticEmployeePhotoUrl({ email: "papi@papihairdesign.sk" })).toBe("/papi.webp");
  });

  it("prefers explicit photo urls over static booking staff fallbacks", () => {
    expect(
      resolveEmployeePhotoUrl({
        display_name: "Mato",
        photo_url: "https://cdn.example.com/mato.jpg",
      }),
    ).toBe("https://cdn.example.com/mato.jpg");
  });
});
