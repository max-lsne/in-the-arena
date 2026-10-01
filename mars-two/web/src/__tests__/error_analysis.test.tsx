import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ErrorAnalysis } from "../components/ErrorAnalysis";
import type { EvalCase } from "../lib/types";

const ledger = (cases: EvalCase[]) => ({
  generator_version: "1",
  seed: 20260912,
  as_of: "2026-09-12",
  cases,
  verdicts: cases.reduce<Record<string, number>>((acc, c) => {
    acc[c.verdict] = (acc[c.verdict] ?? 0) + 1;
    return acc;
  }, {}),
});

const miss: EvalCase = {
  detector: "revenue_leakage",
  company: "meterpath",
  subject: "MET-3102",
  verdict: "miss",
  planted: { kind: "currency_mismatch", amount_cents: 1_870_000 },
  found: null,
};

const match: EvalCase = {
  detector: "revenue_leakage",
  company: "meterpath",
  subject: "MET-2231",
  verdict: "match",
  planted: { kind: "uplift_not_applied", amount_cents: 4_120_000 },
  found: { kind: "uplift_not_applied", amount_cents: 4_120_000 },
};

function mockLedger(payload: unknown, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: status === 200, status, json: async () => payload }) as Response),
  );
}

describe("ErrorAnalysis", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("names the record behind every case, so a row can be opened elsewhere", async () => {
    mockLedger(ledger([miss, match]));

    render(<ErrorAnalysis detector={null} />);

    const rows = await screen.findAllByRole("row");
    expect(within(rows[1]!).getByRole("rowheader")).toHaveTextContent("MET-3102");
  });

  // The point of the view. Scrolling past 123 matches to find the one miss is
  // how a failure stays unread.
  it("puts failures above matches", async () => {
    mockLedger(ledger([miss, match]));

    render(<ErrorAnalysis detector={null} />);
    const rows = await screen.findAllByRole("row");

    expect(rows[1]).toHaveAttribute("data-verdict", "miss");
    expect(rows[2]).toHaveAttribute("data-verdict", "match");
  });

  it("shows what was planted beside what the detector said", async () => {
    mockLedger(ledger([miss]));

    render(<ErrorAnalysis detector={null} />);
    const row = (await screen.findAllByRole("row"))[1]!;

    expect(row).toHaveTextContent("Currency mismatch, €18,700.00");
    expect(row).toHaveTextContent("not found");
  });

  it("counts verdicts rather than recomputing a rate", async () => {
    mockLedger(ledger([miss, match, { ...match, subject: "MET-2890" }]));

    render(<ErrorAnalysis detector={null} />);

    expect(await screen.findByText("2 match")).toBeInTheDocument();
    expect(screen.getByText("1 miss")).toBeInTheDocument();
  });

  it("tells an unrecorded ledger apart from an empty one", async () => {
    mockLedger({ error: "no eval ledger has been recorded" }, 404);

    render(<ErrorAnalysis detector={null} />);

    expect(await screen.findByText(/No eval ledger has been recorded/)).toBeInTheDocument();
  });

  it("asks the platform for one detector rather than filtering in the browser", async () => {
    mockLedger(ledger([match]));

    render(<ErrorAnalysis detector="churn_risk" />);
    await screen.findAllByRole("row");

    expect(vi.mocked(fetch).mock.calls[0]![0]).toContain("detector=churn_risk");
  });
});

describe("ErrorAnalysis, a ranking", () => {
  beforeEach(() => vi.restoreAllMocks());

  const unplanted: EvalCase = {
    detector: "churn_risk",
    company: "clausemark",
    subject: "CLA-C0002",
    verdict: "unplanted",
    planted: null,
    found: { kind: "ranked", rank: 7, score: 0.6231, within_recall_k: false },
  };

  // An account ranked seventh that nobody planted has not been flagged wrongly.
  // Counting those forty rows as failures put forty non-failures above the real
  // ones in a view that exists to surface the real ones.
  // The order itself is the platform's: the ledger arrives sorted, and the
  // table renders it as given. What is asserted here is the rendering.
  it("renders an unplanted rank without tinting it or repeating the word rank", async () => {
    mockLedger(ledger([miss, unplanted]));

    render(<ErrorAnalysis detector={null} />);
    const rows = await screen.findAllByRole("row");

    expect(rows[1]).toHaveAttribute("data-verdict", "miss");
    expect(rows[2]).toHaveAttribute("data-verdict", "unplanted");
    expect(rows[2]).toHaveTextContent("rank 7, score 0.62");
    expect(rows[2]).not.toHaveTextContent("Ranked");
  });
});

describe("ErrorAnalysis, when nothing is wrong", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("says so rather than leaving it to be counted off 163 rows", async () => {
    mockLedger(ledger([match]));

    render(<ErrorAnalysis detector={null} />);

    expect(await screen.findByText(/No case on this ledger is wrong/)).toBeInTheDocument();
  });

  it("says nothing of the kind when a case is wrong", async () => {
    mockLedger(ledger([miss, match]));

    render(<ErrorAnalysis detector={null} />);
    await screen.findAllByRole("row");

    expect(screen.queryByText(/No case on this ledger is wrong/)).not.toBeInTheDocument();
  });
});
