import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import PlatformPage from "./PlatformPage";

describe("PlatformPage", () => {
  afterEach(() => {
    document.head.querySelector('meta[name="robots"]')?.remove();
  });

  it("renders separate managed-product pricing without touching salon service pricing", () => {
    render(
      <MemoryRouter>
        <PlatformPage />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("platform-page")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Oddelený managed produkt/i })).toBeInTheDocument();
    expect(screen.getByText("€199–€490")).toBeInTheDocument();
    expect(screen.getByText("€29–€79 / prevádzka")).toBeInTheDocument();
    expect(screen.getByText(/nie je to salónny cenník PAPI služieb/i)).toBeInTheDocument();
  });

  it("marks the page as noindex for safety", () => {
    render(
      <MemoryRouter>
        <PlatformPage />
      </MemoryRouter>,
    );

    expect(document.title).toBe("Managed booking & operations platform");
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute("content", "noindex,nofollow");
  });
});
