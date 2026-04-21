import { APP_LOGO_SRC } from "@/lib/branding";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LogoIcon } from "./LogoIcon";

describe("LogoIcon", () => {
  it("renders the production favicon asset", () => {
    render(<LogoIcon />);

    const logo = screen.getByAltText("PAPI HAIR DESIGN");
    expect(logo).toHaveAttribute("src", APP_LOGO_SRC);
  });

  it("applies the requested size class", () => {
    render(<LogoIcon size="lg" />);

    const logo = screen.getByAltText("PAPI HAIR DESIGN");
    expect(logo.className).toContain("w-14");
    expect(logo.className).toContain("h-14");
  });
});
