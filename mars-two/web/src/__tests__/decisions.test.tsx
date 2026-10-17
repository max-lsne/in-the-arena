import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Decisions } from "../components/Decisions";
import type { Company, ReconciliationFinding } from "../lib/types";

const company = (slug: string, name: string): Company => ({
  slug,
  name,
  country: "FR",
  vertical: "access_security",
  currency: "EUR",
  arr_cents: 12_000_000_00,
  arr_definition: "contracted_arr",
  acquired_on: null,
});

const finding = (slug: string, reference: string, shortfall: number): ReconciliationFinding => ({
  contract_reference: reference,
  company: slug,
  kinds: ["uplift_not_applied"],
  shortfall_cents: shortfall,
  invoices_checked: 12,
  detail: [],
});

describe("Decisions", () => {
  it("ranks by what is at stake, not by the company order", () => {
    render(
      <Decisions
        companies={[company("vaultline", "Vaultline"), company("meterpath", "Meterpath")]}
        findings={[finding("vaultline", "VAU-1", 100_000), finding("meterpath", "MET-1", 900_000)]}
      />,
    );

    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveTextContent("Meterpath");
    expect(links[0]).toHaveAttribute("href", "#/artefact/meterpath");
  });

  it("says how many and how much, so the line is actionable without opening it", () => {
    render(
      <Decisions
        companies={[company("vaultline", "Vaultline")]}
        findings={[finding("vaultline", "VAU-1", 100_000), finding("vaultline", "VAU-2", 250_000)]}
      />,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveTextContent("2 contracts below contract.");
    // The larger of the two, named, so the line says which one to open.
    expect(link).toHaveTextContent("Largest VAU-2, uplift not applied");
    expect(link).toHaveTextContent("€3,500.00");
  });

  // Nothing to decide is not a section with nothing in it.
  it("renders nothing when no company has a finding", () => {
    const { container } = render(
      <Decisions companies={[company("vaultline", "Vaultline")]} findings={[]} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
