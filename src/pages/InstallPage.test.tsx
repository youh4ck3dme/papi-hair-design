import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import InstallPage from "./InstallPage";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

function setUserAgent(value: string) {
  Object.defineProperty(window.navigator, "userAgent", {
    configurable: true,
    value,
  });
}

describe("InstallPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })),
    });
  });

  it("renders desktop fallback when no install prompt is available", () => {
    render(<InstallPage />);

    expect(screen.getByText("PAPI HAIR DESIGN")).toBeInTheDocument();
    expect(screen.getByText(/Chrome/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Pokračovať bez inštalácie/i })).toHaveAttribute("href", "/booking");
  });

  it("renders iOS instructions on Apple devices", () => {
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");

    render(<InstallPage />);

    expect(screen.getByText(/Návod pre iPhone \/ iPad/i)).toBeInTheDocument();
    expect(screen.getByText(/Pridať na plochu/i)).toBeInTheDocument();
  });

  it("handles deferred install prompt acceptance", async () => {
    const promptMock = vi.fn().mockResolvedValue(undefined);
    const installEvent = new Event("beforeinstallprompt");
    Object.assign(installEvent, {
      preventDefault: vi.fn(),
      prompt: promptMock,
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });

    render(<InstallPage />);

    act(() => {
      window.dispatchEvent(installEvent);
    });

    fireEvent.click(await screen.findByRole("button", { name: /Nainštalovať aplikáciu/i }));

    await waitFor(() => {
      expect(promptMock).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText(/Aplikácia je nainštalovaná/i)).toBeInTheDocument();
  });

  it("marks app as installed after appinstalled event", async () => {
    render(<InstallPage />);

    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });

    expect(await screen.findByText(/Aplikácia je nainštalovaná/i)).toBeInTheDocument();
  });
});
