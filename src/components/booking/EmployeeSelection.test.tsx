import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { EmployeeRow } from "./types";
import { EmployeeSelection } from "./EmployeeSelection";

const makeEmployee = (overrides: Partial<EmployeeRow> = {}): EmployeeRow => ({
  id: "emp-1",
  display_name: "Stylist",
  email: null,
  phone: null,
  is_active: true,
  business_id: "biz-1",
  photo_url: null,
  profile_id: null,
  service_mode: "all",
  ...overrides,
});

describe("EmployeeSelection", () => {
  it("renders 3 stylists with image sources (employee photo + profile fallback)", () => {
    const employees: EmployeeRow[] = [
      makeEmployee({
        id: "emp-1",
        display_name: "Anna",
        photo_url: "https://cdn.example.com/anna.jpg",
      }),
      {
        ...makeEmployee({ id: "emp-2", display_name: "Maria" }),
        avatar_url: "https://cdn.example.com/maria.jpg",
      } as EmployeeRow,
      {
        ...makeEmployee({ id: "emp-3", display_name: "Zora" }),
        profile: { avatar_url: "https://cdn.example.com/zora.jpg" },
      } as EmployeeRow,
    ];

    render(
      <EmployeeSelection
        employees={employees}
        selectedEmployeeId={null}
        setSelectedEmployeeId={vi.fn()}
      />
    );

    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(3);
    expect(images[0]).toHaveAttribute("src", expect.stringContaining("anna.jpg"));
    expect(images[1]).toHaveAttribute("src", expect.stringContaining("maria.jpg"));
    expect(images[2]).toHaveAttribute("src", expect.stringContaining("zora.jpg"));
  });

  it("falls back to local placeholder when image loading fails", async () => {
    render(
      <EmployeeSelection
        employees={[
          makeEmployee({
            id: "emp-broken",
            display_name: "Broken Photo",
            photo_url: "https://cdn.example.com/broken.jpg",
          }),
        ]}
        selectedEmployeeId={null}
        setSelectedEmployeeId={vi.fn()}
      />
    );

    const image = screen.getByRole("img", { name: "Broken Photo" });
    fireEvent.error(image);

    await waitFor(() => {
      expect(image).toHaveAttribute("src", expect.stringContaining("/placeholder.svg"));
    });
  });

  it("renders skeleton cards while loading", () => {
    render(
      <EmployeeSelection
        employees={[]}
        isLoading
        selectedEmployeeId={null}
        setSelectedEmployeeId={vi.fn()}
      />
    );

    expect(screen.getAllByTestId("employee-card-skeleton")).toHaveLength(3);
  });
});

