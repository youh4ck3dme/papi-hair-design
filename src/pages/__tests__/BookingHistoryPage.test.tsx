import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BookingHistoryPage from "../BookingHistoryPage";

vi.mock("@/integrations/firebase/lookupBookingHistory", () => ({
  lookupBookingHistory: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe("BookingHistoryPage", () => {
  let lookupBookingHistory: ReturnType<typeof vi.fn>;
  let toast: { error: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    ({ lookupBookingHistory } = await import("@/integrations/firebase/lookupBookingHistory"));
    ({ toast } = await import("sonner"));
    lookupBookingHistory.mockReset();
    toast.error.mockReset();
    window.localStorage.clear();
  });

  it("loads history from magic link query", async () => {
    lookupBookingHistory.mockResolvedValue({
      success: true,
      customer_email: "user@example.com",
      appointments: [
        {
          id: "ref-1",
          service_name: "Express",
          start_at: "2099-03-01T09:00:00.000Z",
          status: "confirmed",
          is_reference: true,
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={["/dashboard/history?access=token123&ref=ref-1"]}>
        <BookingHistoryPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(lookupBookingHistory).toHaveBeenCalled());
    expect(await screen.findByText("Express")).toBeInTheDocument();
    expect(screen.getByText(/Referencia:/i)).toHaveTextContent("ref-1");
  });

  it("shows error toast when lookup fails", async () => {
    lookupBookingHistory.mockRejectedValue(new Error("boom"));

    render(
      <MemoryRouter initialEntries={["/dashboard/history"]}>
        <BookingHistoryPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Referencia rezervácie/i), { target: { value: "book-1" } });
    fireEvent.change(screen.getByLabelText(/^E-mail$/i), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText(/Telefón/i), { target: { value: "+421905123456" } });
    fireEvent.click(screen.getByRole("button", { name: /Načítať históriu/i }));

    await waitFor(() => expect(lookupBookingHistory).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith("Históriu rezervácií sa nepodarilo načítať.");
  });
});
