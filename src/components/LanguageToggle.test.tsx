import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageToggle } from "./LanguageToggle";

const changeLanguage = vi.fn();
const mockI18n = { language: "sk", changeLanguage };

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: mockI18n, t: (k: string) => k }),
}));

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("LanguageToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    mockI18n.language = "sk";
  });

  it("shows SK label when language is sk", () => {
    render(<LanguageToggle />);
    expect(screen.getByText("SK")).toBeInTheDocument();
  });

  it("shows EN label when language is en", () => {
    mockI18n.language = "en";
    render(<LanguageToggle />);
    expect(screen.getByText("EN")).toBeInTheDocument();
  });

  it("calls i18n.changeLanguage with 'en' when toggled from sk", () => {
    render(<LanguageToggle />);
    fireEvent.click(screen.getByRole("button"));
    expect(changeLanguage).toHaveBeenCalledWith("en");
  });

  it("calls i18n.changeLanguage with 'sk' when toggled from en", () => {
    mockI18n.language = "en";
    render(<LanguageToggle />);
    fireEvent.click(screen.getByRole("button"));
    expect(changeLanguage).toHaveBeenCalledWith("sk");
  });

  it("saves language to localStorage on toggle", () => {
    render(<LanguageToggle />);
    fireEvent.click(screen.getByRole("button"));
    expect(localStorageMock.getItem("lang")).toBe("en");
  });
});
