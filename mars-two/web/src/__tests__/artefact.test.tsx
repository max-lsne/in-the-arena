import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Artefact } from "../components/Artefact";
import type { Company, ReconciliationFinding } from "../lib/types";

const meterpath: Company = {
  slug: "meterpath",
  name: "Meterpath",
  country: "LV",
  vertical: "marketplace_billing",
  currency: "EUR",
  arr_cents: 14_500_000_00,
  arr_definition: "contracted_arr",
  acquired_on: null,
};

const finding = (
  reference: string,
  kind: string,
  shortfall: number,
  overrides: Partial<ReconciliationFinding> = {},
): ReconciliationFinding => ({
  contract_reference: reference,
  company: "meterpath",
  kinds: [kind],
  shortfall_cents: shortfall,
  invoices_checked: 12,
  detail: [
    {
      invoice_number: `INV-${reference}`,
      period_start: "2026-04-01",
      expected_cents: 100_000,
      billed_cents: 90_000,
      billed_currency: "EUR",
      gap_cents: 10_000,
    },
  ],
  ...overrides,
});

function mockApi(findings: ReconciliationFinding[], clause: string | null) {
  return vi.fn(async (path: string) => {
    const body = path.startsWith("/api/v1/retrieval")
      ? { backend: "hashed", results: clause ? [{ company: "meterpath", cite: "c", document_title: "t", source_ref: "MET-0012", kind: "contract", section_ref: "4.2", position: 3, content: clause }] : [] }
      : {
          findings,
          total_findings: findings.length,
          total_shortfall_cents: findings.reduce((n, f) => n + f.shortfall_cents, 0),
          currency: "EUR",
        };

    return { ok: true, status: 200, json: async () => body } as Response;
  });
}

describe("Artefact", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("states the total exactly, because someone invoices against it", async () => {
    vi.stubGlobal("fetch", mockApi([finding("MET-0012", "uplift_not_applied", 4_120_000)], "4.2 Annual uplift"));

    render(<Artefact company={meterpath} />);

    // Not "about €41k". The register rounds; an artefact cannot. Twice over:
    // the total in the lede and the claim itself.
    expect(await screen.findAllByText(/€41,200\.00/)).toHaveLength(2);
  });

  it("shows the clause beside the figure rather than behind a disclosure", async () => {
    vi.stubGlobal(
      "fetch",
      mockApi(
        [finding("MET-0012", "uplift_not_applied", 4_120_000)],
        "4.2 Annual uplift\nThe Annual Fee shall increase by 4.0% on each anniversary.",
      ),
    );

    render(<Artefact company={meterpath} />);

    const evidence = await screen.findByRole("complementary", { name: /evidence/i });
    await waitFor(() => expect(evidence).toHaveTextContent(/4\.0% on each anniversary/));
    expect(evidence).toHaveTextContent("MET-0012 s.4.2");
  });

  // The whole invariant in one test: every claim has evidence, and an empty
  // evidence column reads as "no evidence needed" unless it says otherwise.
  it("says the corpus has no clause rather than showing an empty column", async () => {
    vi.stubGlobal("fetch", mockApi([finding("MET-0012", "uplift_not_applied", 4_120_000)], null));

    render(<Artefact company={meterpath} />);

    const evidence = await screen.findByRole("complementary", { name: /evidence/i });
    await waitFor(() => expect(evidence).toHaveTextContent(/No clause in the corpus/));
  });

  it("opens the evidence for whichever claim is selected", async () => {
    vi.stubGlobal(
      "fetch",
      mockApi(
        [
          finding("MET-0012", "uplift_not_applied", 4_120_000),
          finding("MET-0099", "seat_growth_unbilled", 5_290_000),
        ],
        "clause text",
      ),
    );

    render(<Artefact company={meterpath} />);

    const second = await screen.findByRole("button", { name: /MET-0099/ });
    await userEvent.click(second);

    expect(second).toHaveAttribute("aria-pressed", "true");
    const evidence = screen.getByRole("complementary", { name: /evidence/i });
    await waitFor(() => expect(evidence).toHaveTextContent("INV-MET-0099"));
  });

  it("reports a foreign currency rather than converting it silently", async () => {
    const usd = finding("MET-0301", "currency_mismatch", 1_870_000, {
      detail: [
        {
          invoice_number: "INV-9",
          period_start: "2026-05-01",
          expected_cents: 100_000,
          billed_cents: 83_000,
          billed_currency: "USD",
          gap_cents: 17_000,
        },
      ],
    });
    vi.stubGlobal("fetch", mockApi([usd], "6.1 Currency"));

    render(<Artefact company={meterpath} />);

    expect(await screen.findByText("USD")).toBeInTheDocument();
  });

  it("says nothing was found rather than rendering an empty table", async () => {
    vi.stubGlobal("fetch", mockApi([], null));

    render(<Artefact company={meterpath} />);

    expect(await screen.findByText(/Nothing to correct/)).toBeInTheDocument();
  });
});
