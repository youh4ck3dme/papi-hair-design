import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BookingHistoryPage from "../BookingHistoryPage";

vi.mock("@/integrations/firebase/lookupBookingHistory", () => ({
  lookupBookingHistory: vi.fn(),
}));
vi.mock("@/integrations/firebase/cancelCustomerBooking", () => ({
  cancelCustomerBooking: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("BookingHistoryPage", () => {
  let lookupBookingHistory: ReturnType<typeof vi.fn>;
  let cancelCustomerBooking: ReturnType<typeof vi.fn>;
  let toast: { error: ReturnType<typeof vi.fn>; success: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    ({ lookupBookingHistory } = await import("@/integrations/firebase/lookupBookingHistory"));
    ({ cancelCustomerBooking } = await import("@/integrations/firebase/cancelCustomerBooking"));
    ({ toast } = await import("sonner"));
    lookupBookingHistory.mockReset();
    cancelCustomerBooking.mockReset();
    toast.error.mockReset();
    toast.success.mockReset();
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

  it("opens cancel dialog and cancels future bookings", async () => {
    lookupBookingHistory.mockResolvedValue({
      success: true,
      customer_email: "user@example.com",
      customer_phone: "+421905123456",
      reference: "ref-1",
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
    cancelCustomerBooking.mockResolvedValue({
      success: true,
      appointment_id: "ref-1",
      status: "cancelled",
    });
    render(
      <MemoryRouter initialEntries={[{
        pathname: "/dashboard/history",
        state: {
          bookingHistoryAccess: {
            accessToken: "token123",
            reference: "ref-1",
          },
        },
      }]}>
        <BookingHistoryPage />
      </MemoryRouter>
    );

    await screen.findByRole("button", { name: /Zrušiť rezerváciu/i });
    fireEvent.click(screen.getByRole("button", { name: /Zrušiť rezerváciu/i }));

    expect(await screen.findByText(/Zrušiť túto rezerváciu\?/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Áno, zrušiť/i }));

    await waitFor(() => expect(cancelCustomerBooking).toHaveBeenCalledWith(expect.objectContaining({
      appointment_id: "ref-1",
      access_token: "token123",
      reference: "ref-1",
    })));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Rezervácia bola zrušená."));
    await waitFor(() => expect(lookupBookingHistory).toHaveBeenCalledTimes(2));
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

  it("does not show cancel action for completed or past bookings", async () => {
    lookupBookingHistory.mockResolvedValue({
      success: true,
      customer_email: "user@example.com",
      appointments: [
        {
          id: "done-1",
          service_name: "Completed",
          start_at: "2099-03-01T09:00:00.000Z",
          status: "completed",
        },
        {
          id: "past-1",
          service_name: "Past confirmed",
          start_at: "2020-03-01T09:00:00.000Z",
          status: "confirmed",
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={["/dashboard/history?access=token123&ref=done-1"]}>
        <BookingHistoryPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Past confirmed")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Zrušiť rezerváciu/i })).not.toBeInTheDocument();
  });

  it("shows callable error message when cancellation fails and keeps current history intact", async () => {
    lookupBookingHistory.mockResolvedValue({
      success: true,
      customer_email: "user@example.com",
      customer_phone: "+421905123456",
      reference: "ref-1",
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
    cancelCustomerBooking.mockRejectedValue(new Error("Storningu momentálne bráni server."));

    render(
      <MemoryRouter initialEntries={[{
        pathname: "/dashboard/history",
        state: {
          bookingHistoryAccess: {
            accessToken: "token123",
            reference: "ref-1",
          },
        },
      }]}>
        <BookingHistoryPage />
      </MemoryRouter>
    );

    await screen.findByRole("button", { name: /Zrušiť rezerváciu/i });
    fireEvent.click(screen.getByRole("button", { name: /Zrušiť rezerváciu/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Áno, zrušiť/i }));

    await waitFor(() => expect(cancelCustomerBooking).toHaveBeenCalledTimes(1));
    expect(toast.error).toHaveBeenCalledWith("Storningu momentálne bráni server.");
    expect(lookupBookingHistory).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Express")).toBeInTheDocument();
  });
});
