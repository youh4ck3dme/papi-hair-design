import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Pricing from "./Pricing";

const pricingDataState = vi.hoisted(() => ({
  defaultValue: {
    initialLoading: false,
    services: [
      {
        id: "svc-1",
        name_sk: "Pánsky strih",
        description_sk: null,
        price: 19,
        duration_minutes: 45,
        buffer_minutes: 0,
        sort_order: 1,
        is_active: true,
        business_id: "biz-1",
        category: "panske",
        subcategory: "Vlasy",
        subcategory_id: null,
      },
      {
        id: "svc-2",
        name_sk: "Dámsky strih",
        description_sk: "Vrátane stylingu.",
        price: 30,
        duration_minutes: 60,
        buffer_minutes: 0,
        sort_order: 1,
        is_active: true,
        business_id: "biz-1",
        category: "damske",
        subcategory: "Strih",
        subcategory_id: null,
      },
      {
        id: "svc-3",
        name_sk: "Depilácia nosa aj uši",
        description_sk: null,
        price: 5,
        duration_minutes: 15,
        buffer_minutes: 0,
        sort_order: 1,
        is_active: true,
        business_id: "biz-1",
        category: "panske",
        subcategory: "Doplnkové služby",
        subcategory_id: null,
      },
    ],
  },
  value: {} as {
    initialLoading: boolean;
    services: Array<any>;
  },
}));

vi.mock("@/hooks/usePricingData", () => ({
  usePricingData: () => pricingDataState.value,
}));

describe("Pricing", () => {
  beforeEach(() => {
    pricingDataState.value = pricingDataState.defaultValue;
  });

  it("renders three public service categories from admin services", () => {
    render(
      <MemoryRouter>
        <Pricing />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /Cenník služieb/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Pánske služby/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Dámske služby/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Doplnkové služby/i })).toBeInTheDocument();
  });

  it("switches to doplnkové služby and renders their rows", () => {
    render(
      <MemoryRouter>
        <Pricing />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Doplnkové služby/i }));

    expect(screen.getByText("Depilácia nosa aj uši")).toBeInTheDocument();
    expect(screen.getByText("5 €")).toBeInTheDocument();
  });

  it("uses the unified splash while pricing data is loading", () => {
    pricingDataState.value = {
      ...pricingDataState.value,
      initialLoading: true,
      services: [],
    };

    render(
      <MemoryRouter>
        <Pricing />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("pricing-loading-state")).toBeInTheDocument();
    expect(screen.getByTestId("pricing-loading-state")).not.toHaveTextContent("Načítavame");
  });
});
