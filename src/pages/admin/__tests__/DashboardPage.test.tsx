import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { format } from "date-fns";
import DashboardPage from "../DashboardPage";

vi.mock("@/hooks/useBusiness", () => ({
  useBusiness: () => ({ businessId: "biz" }),
}));

const makeSnapshot = (items: any[]) => ({
  size: items.length,
  docs: items.map((item, index) => ({
    id: item.id ?? `doc-${index}`,
    data: () => item,
  })),
});

const { getDocsMock } = vi.hoisted(() => ({
  getDocsMock: vi.fn(),
}));
vi.mock("firebase/firestore", async () => {
  const actual = await vi.importActual("firebase/firestore");
  return {
    ...actual,
    collection: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    getDocs: getDocsMock,
  };
});

describe("DashboardPage", () => {
  beforeEach(() => {
    getDocsMock.mockReset();
  });

  it("renders stats and appointment cards after load", async () => {
    const todayAppointmentStart = `${format(new Date(), "yyyy-MM-dd")}T09:30:00.000Z`;

    getDocsMock
      .mockResolvedValueOnce(makeSnapshot([{ status: "confirmed" }, { status: "cancelled" }]))
      .mockResolvedValueOnce(makeSnapshot([]))
      .mockResolvedValueOnce(makeSnapshot([]))
      .mockResolvedValueOnce(
      makeSnapshot([
        {
          start_at: todayAppointmentStart,
          status: "confirmed",
          customer_name: "Test User",
          service_name: "Haircut",
          customer_email: "test@example.com",
          customer_phone: "+421905123456",
        },
      ])
    );

    render(<DashboardPage />);

    expect(await screen.findByText("Dnes")).toBeInTheDocument();
    expect(await screen.findByText(/Haircut/i)).toBeInTheDocument();
    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(screen.getByText("+421905123456")).toBeInTheDocument();
    expect(getDocsMock).toHaveBeenCalledTimes(4);
  });

  it("shows error message when fetch fails", async () => {
    getDocsMock.mockRejectedValue(new Error("boom"));
    render(<DashboardPage />);

    expect(await screen.findByText("Nepodarilo sa načítať údaje")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Obnoviť" })).not.toBeDisabled();
  });
});
