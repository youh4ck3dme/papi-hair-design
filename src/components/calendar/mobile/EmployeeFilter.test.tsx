import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EmployeeFilter from "./EmployeeFilter";

const employees = [
  { id: "emp-1", name: "Jana", color: "#10b981" },
  { id: "emp-2", name: "Marek", color: "#3b82f6" },
];

describe("EmployeeFilter", () => {
  it("renders employees and marks selected with aria-pressed", () => {
    render(
      <EmployeeFilter
        employees={employees}
        selectedEmployeeIds={["emp-1"]}
        onToggle={vi.fn()}
        onSelectAll={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Jana" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Marek" })).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onToggle with employee id when employee chip is clicked", () => {
    const onToggle = vi.fn();
    render(
      <EmployeeFilter
        employees={employees}
        selectedEmployeeIds={[]}
        onToggle={onToggle}
        onSelectAll={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Marek" }));
    expect(onToggle).toHaveBeenCalledWith("emp-2");
  });

  it("shows 'Vyber všetkých' when not all employees are selected", () => {
    render(
      <EmployeeFilter
        employees={employees}
        selectedEmployeeIds={["emp-1"]}
        onToggle={vi.fn()}
        onSelectAll={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Vyber všetkých" })).toBeInTheDocument();
  });

  it("shows 'Zrušiť výber' when all employees are selected", () => {
    render(
      <EmployeeFilter
        employees={employees}
        selectedEmployeeIds={["emp-1", "emp-2"]}
        onToggle={vi.fn()}
        onSelectAll={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Zrušiť výber" })).toBeInTheDocument();
  });

  it("calls onSelectAll when select-all action is clicked", () => {
    const onSelectAll = vi.fn();
    render(
      <EmployeeFilter
        employees={employees}
        selectedEmployeeIds={[]}
        onToggle={vi.fn()}
        onSelectAll={onSelectAll}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Vyber všetkých" }));
    expect(onSelectAll).toHaveBeenCalledTimes(1);
  });
});
