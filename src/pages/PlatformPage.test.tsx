import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { PLATFORM_VERTICAL_COUNT } from "@/lib/platformVerticals";

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
    expect(screen.getByRole("heading", { name: /Rezervačný systém/i })).toBeInTheDocument();
    expect(screen.getAllByText(/€199–€490/i).length).toBeGreaterThan(0);
    expect(screen.getByText("€29–€79 mesačne")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Jedna booking šablóna/i })).toBeInTheDocument();
    expect(screen.getByText("Zubná starostlivosť")).toBeInTheDocument();
    expect(screen.getByText("Domáci miláčikovia")).toBeInTheDocument();
    expect(screen.getAllByTestId("platform-vertical-chip")).toHaveLength(PLATFORM_VERTICAL_COUNT);
    expect(screen.getByText(/Čo budeme merať od prvého pilotu/i)).toBeInTheDocument();
    expect(screen.getByText(/Color picker, ktorý nepôsobí lacno/i)).toBeInTheDocument();
    expect(screen.getByText(/mimo PAPI produkčného surface/i)).toBeInTheDocument();
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
