import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArrBand } from "../components/ArrBand";
import { inFixedOrder, COMPANY_ORDER } from "../lib/companies";
import type { Company } from "../lib/types";

const co = (slug: string, name: string, arr: number): Company => ({
  slug, name, country: "FR", vertical: "v", currency: "EUR",
  arr_cents: arr, arr_definition: "contracted_arr", acquired_on: null,
});

const two = [co("vaultline", "Vaultline", 1_200_000_000), co("meterpath", "Meterpath", 400_000_000)];

describe("ArrBand", () => {
  it("states the portfolio total", () => {
    render(<ArrBand companies={two} selected={null} onSelect={() => {}} />);

    expect(screen.getByRole("heading", { name: /€16.0M ARR/ })).toBeInTheDocument();
  });

  it("sizes each segment by its share of the total", () => {
    const { container } = render(<ArrBand companies={two} selected={null} onSelect={() => {}} />);
    const widths = [...container.querySelectorAll<HTMLElement>(".band__segment")].map(
      (el) => el.style.width,
    );

    expect(widths).toEqual(["75%", "25%"]);
  });

  it("is the navigation, not just a chart", async () => {
    const onSelect = vi.fn();
    render(<ArrBand companies={two} selected={null} onSelect={onSelect} />);

    await userEvent.click(screen.getByRole("button", { name: /Vaultline/ }));

    expect(onSelect).toHaveBeenCalledWith("vaultline");
  });

  it("clears the selection when the selected segment is clicked again", async () => {
    const onSelect = vi.fn();
    render(<ArrBand companies={two} selected="vaultline" onSelect={onSelect} />);

    await userEvent.click(screen.getByRole("button", { name: /Vaultline/ }));

    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("gives assistive technology the figure the segment encodes visually", () => {
    render(<ArrBand companies={two} selected={null} onSelect={() => {}} />);

    expect(screen.getByRole("button", { name: /€12.0M, 75.0 percent/ })).toBeInTheDocument();
  });
});

describe("inFixedOrder", () => {
  // An operator learns where a company sits and stops reading names. Sorting by
  // a metric would move rows under the cursor on every refresh.
  it("puts companies in the fixed order regardless of arrival order", () => {
    const shuffled = [...COMPANY_ORDER].reverse().map((slug) => co(slug, slug, 1));

    expect(inFixedOrder(shuffled).map((c) => c.slug)).toEqual([...COMPANY_ORDER]);
  });
});
