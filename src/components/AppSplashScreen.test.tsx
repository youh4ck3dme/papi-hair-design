import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppSplashScreen } from "@/components/AppSplashScreen";

describe("AppSplashScreen", () => {
  it("renders one neutral loading surface without descriptive copy", () => {
    render(<AppSplashScreen />);

    const splash = screen.getByTestId("app-splash-screen");
    expect(splash).toBeInTheDocument();
    expect(screen.getByRole("status", { hidden: true })).toHaveAttribute("aria-label", "Načítava sa");
    expect(splash).not.toHaveTextContent("Načítavame");
    expect(splash).not.toHaveTextContent("Pripravujeme");
  });
});
