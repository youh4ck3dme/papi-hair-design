import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import PrivacyPage from "./PrivacyPage";
import TermsPage from "./TermsPage";
import Index from "./Index";

vi.mock("@/components/ThemeToggle", () => ({
  ThemeToggle: () => <button type="button">theme-toggle</button>,
}));

vi.mock("@/components/LanguageToggle", () => ({
  LanguageToggle: () => <button type="button">language-toggle</button>,
}));

describe("static pages", () => {
  it("renders privacy page with back button and GDPR section", () => {
    render(
      <MemoryRouter>
        <PrivacyPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /Ochrana súkromia/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Vaše práva \(GDPR\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Späť/i })).toBeInTheDocument();
  });

  it("renders terms page with privacy link", () => {
    render(
      <MemoryRouter>
        <TermsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Zmluvné podmienky")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Zásady ochrany osobných údajov/i })).toHaveAttribute("href", "/privacy");
  });

  it("renders index page contact details and primary links", () => {
    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>,
    );

    expect(screen.getByText("PAPI HAIR DESIGN")).toBeInTheDocument();
    expect(screen.getByText("language-toggle")).toBeInTheDocument();
    expect(screen.queryByText("theme-toggle")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Rezervovať/i })).toHaveAttribute("href", "/booking");
    expect(screen.getByRole("link", { name: /Prihlásiť/i })).toHaveAttribute("href", "/auth");
  });
});
