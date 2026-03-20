import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppointmentDetailSheet from "./AppointmentDetailSheet";
import type { CalendarAppointment } from "@/components/calendar/AppointmentBlock";

vi.mock("@/components/ui/drawer", () => ({
  Drawer: ({
    open,
    children,
    overlayClassName,
  }: {
    open: boolean;
    children: React.ReactNode;
    overlayClassName?: string;
  }) =>
    open ? (
      <div data-testid="drawer-root" data-overlay-class={overlayClassName ?? ""}>
        {children}
      </div>
    ) : null,
  DrawerContent: ({
    className,
    children,
  }: {
    className?: string;
    children: React.ReactNode;
  }) => (
    <div data-testid="drawer-content" className={className}>
      {children}
    </div>
  ),
  DrawerHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h2 className={className}>{children}</h2>
  ),
  DrawerFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

function makeAppointment(overrides: Partial<CalendarAppointment> = {}): CalendarAppointment {
  return {
    id: "apt-1",
    start_at: "2026-03-20T09:00:00.000Z",
    end_at: "2026-03-20T09:30:00.000Z",
    status: "confirmed",
    service_name: "Pánsky strih",
    employee_name: "Papi",
    customer_name: "Erik Babcan",
    notes: "Test detail",
    ...overrides,
  };
}

describe("AppointmentDetailSheet", () => {
  it("uses stronger dark overlay and darker drawer surface", () => {
    render(
      <AppointmentDetailSheet
        open
        onOpenChange={vi.fn()}
        appointment={makeAppointment()}
      />
    );

    expect(screen.getByTestId("drawer-root")).toHaveAttribute("data-overlay-class", "bg-black/92");

    const content = screen.getByTestId("drawer-content");
    expect(content.className).toContain("bg-[hsl(222,20%,8%)]");
    expect(content.className).toContain("border-white/15");
  });

  it("does not render when appointment is null", () => {
    render(
      <AppointmentDetailSheet
        open
        onOpenChange={vi.fn()}
        appointment={null}
      />
    );

    expect(screen.queryByTestId("drawer-root")).not.toBeInTheDocument();
  });
});
