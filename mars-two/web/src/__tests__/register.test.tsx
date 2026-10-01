import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Register } from "../components/Register";
import type { Company, MetricValue } from "../lib/types";

const company = (slug: string, name: string, arr: number): Company => ({
  slug,
  name,
  country: "FR",
  vertical: "access_security",
  currency: "EUR",
  arr_cents: arr,
  arr_definition: "contracted_arr",
  acquired_on: null,
});

const metric = (
  slug: string,
  key: string,
  value: string,
  unit: MetricValue["unit"],
  period = "2026-09-01",
): MetricValue => ({
  company: slug,
  metric_key: key,
  grain: "month",
  period_start: period,
  period_end: "2026-09-30",
  value,
  unit,
  formula: "f",
  input_count: 10,
  computed_at: "2026-09-12T00:00:00Z",
});

describe("Register", () => {
  it("renders one row per company as a real table", () => {
    render(
      <Register
        companies={[company("vaultline", "Vaultline", 1_200_000_000)]}
        metrics={[metric("vaultline", "arr_cents", "1200000000", "eur_cents")]}
      />,
    );

    expect(screen.getByRole("row", { name: /Vaultline/ })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "ARR" })).toBeInTheDocument();
  });

  // Absence has to stay distinguishable from measurement. The platform omits a
  // metric it could not compute; showing 0 would report a median of zero days as
  // time to value.
  it("shows a dash for a metric that was not computed, never a zero", () => {
    render(<Register companies={[company("vaultline", "Vaultline", 1)]} metrics={[]} />);

    expect(screen.getAllByLabelText("not computed").length).toBeGreaterThan(0);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("states each company's own definition of recurring revenue", () => {
    render(<Register companies={[company("vaultline", "Vaultline", 1)]} metrics={[]} />);

    expect(screen.getByText("contracted arr")).toBeInTheDocument();
  });

  it("leaves a value inside its band uncoloured", () => {
    const { container } = render(
      <Register
        companies={[company("vaultline", "Vaultline", 1)]}
        metrics={[metric("vaultline", "net_revenue_retention", "1.05", "ratio")]}
      />,
    );

    expect(container.querySelector('[data-breach]')).toBeNull();
  });

  it("marks a value that has broken out of its band", () => {
    const { container } = render(
      <Register
        companies={[company("vaultline", "Vaultline", 1)]}
        metrics={[metric("vaultline", "net_revenue_retention", "0.88", "ratio")]}
      />,
    );

    expect(container.querySelector('[data-breach="below"]')).not.toBeNull();
  });

  it("orders a series by period before drawing it", () => {
    const { container } = render(
      <Register
        companies={[company("vaultline", "Vaultline", 1)]}
        metrics={[
          metric("vaultline", "net_revenue_retention", "0.80", "ratio", "2026-09-01"),
          metric("vaultline", "net_revenue_retention", "1.05", "ratio", "2026-07-01"),
          metric("vaultline", "net_revenue_retention", "1.02", "ratio", "2026-08-01"),
        ]}
      />,
    );

    // The latest period is September, whose value breaches the band. If the
    // series were left in arrival order the July value would be treated as
    // latest and nothing would be flagged.
    expect(container.querySelector('[data-breach="below"]')).not.toBeNull();
  });
});

describe("the name column", () => {
  it("keeps a specificity high enough to win against the table's own rule", () => {
    // `.register th` is a class plus an element and outranks a bare class. The
    // first version of the stylesheet lost this fight silently and the column
    // rendered right-aligned with no error anywhere.
    const rules = readFileSync(resolve(process.cwd(), "src/app.css"), "utf8");

    expect(rules).toMatch(/th\.register__name/);
    expect(rules).toMatch(/td\.register__name/);
  });
});

describe("direction of good", () => {
  // 180 open tickets rendered green as "above the band" is a confident wrong
  // signal, which is worse than no signal at all.
  it("marks too many open tickets as bad, not as above", () => {
    const { container } = render(
      <Register
        companies={[company("vaultline", "Vaultline", 1)]}
        metrics={[metric("vaultline", "open_tickets", "180", "count")]}
      />,
    );

    expect(container.querySelector('[data-breach="below"]')).not.toBeNull();
    expect(container.querySelector('[data-breach="above"]')).toBeNull();
  });

  it("marks retention above its band as good", () => {
    const { container } = render(
      <Register
        companies={[company("vaultline", "Vaultline", 1)]}
        metrics={[metric("vaultline", "net_revenue_retention", "1.22", "ratio")]}
      />,
    );

    expect(container.querySelector('[data-breach="above"]')).not.toBeNull();
  });

  it("marks churn above its band as bad", () => {
    const { container } = render(
      <Register
        companies={[company("vaultline", "Vaultline", 1)]}
        metrics={[metric("vaultline", "gross_churn_rate", "0.09", "ratio")]}
      />,
    );

    expect(container.querySelector('[data-breach="below"]')).not.toBeNull();
  });
});

describe("Register, direction of good", () => {
  // Two copies of a rule that decides whether a colour means better or worse is
  // one copy too many, and the copy in the browser is the one nobody would think
  // to update. The platform's declaration wins.
  it("takes the platform's word for which direction is good", () => {
    const overridden = {
      ...metric("vaultline", "pipeline_coverage", "9.0", "multiple"),
      higher_is_better: false,
    };

    render(
      <Register companies={[company("vaultline", "Vaultline", 12_000_000_00)]} metrics={[overridden]} />,
    );

    // 9.0x is above the band. Declared lower-is-better, that is a breach below.
    const cell = screen.getByText("9.0x").closest("td");
    expect(cell).toHaveAttribute("data-breach", "below");
  });

  it("falls back to the column when the platform declares nothing", () => {
    render(
      <Register
        companies={[company("vaultline", "Vaultline", 12_000_000_00)]}
        metrics={[metric("vaultline", "pipeline_coverage", "9.0", "multiple")]}
      />,
    );

    const cell = screen.getByText("9.0x").closest("td");
    expect(cell).toHaveAttribute("data-breach", "above");
  });
});

describe("Register, a month still running", () => {
  const finished = {
    ...metric("vaultline", "gross_churn_rate", "0.0096", "ratio", "2026-08-01"),
    complete: true,
  };
  const running = {
    ...metric("vaultline", "gross_churn_rate", "0", "ratio", "2026-09-01"),
    complete: false,
  };

  // On the third of the month every flow metric reads near zero. A register that
  // prints that as the figure says churn stopped.
  it("shows the last finished period rather than the month in progress", () => {
    render(
      <Register
        companies={[company("vaultline", "Vaultline", 12_000_000_00)]}
        metrics={[finished, running]}
      />,
    );

    expect(screen.getByText("1.0%")).toBeInTheDocument();
    expect(screen.queryByText("0.0%")).not.toBeInTheDocument();
  });

  it("falls back to the running month when nothing has finished, and says so", () => {
    render(
      <Register
        companies={[company("vaultline", "Vaultline", 12_000_000_00)]}
        metrics={[running]}
      />,
    );

    expect(screen.getByText("0.0%")).toBeInTheDocument();
    expect(screen.getByText("MTD")).toBeInTheDocument();
  });

  it("says nothing when the platform does not send completeness", () => {
    render(
      <Register
        companies={[company("vaultline", "Vaultline", 12_000_000_00)]}
        metrics={[metric("vaultline", "gross_churn_rate", "0.0096", "ratio")]}
      />,
    );

    expect(screen.getByText("1.0%")).toBeInTheDocument();
    expect(screen.queryByText("MTD")).not.toBeInTheDocument();
  });
});
