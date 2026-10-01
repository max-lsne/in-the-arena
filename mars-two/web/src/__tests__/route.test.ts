import { describe, expect, it } from "vitest";
import { hrefFor, parseRoute } from "../lib/route";

describe("routing", () => {
  it("reads the portfolio from an empty hash", () => {
    expect(parseRoute("")).toEqual({ kind: "portfolio", company: null });
    expect(parseRoute("#/")).toEqual({ kind: "portfolio", company: null });
  });

  it("reads a selected company, an artefact and the ledger", () => {
    expect(parseRoute("#/company/meterpath")).toEqual({ kind: "portfolio", company: "meterpath" });
    expect(parseRoute("#/artefact/meterpath")).toEqual({ kind: "artefact", company: "meterpath" });
    expect(parseRoute("#/evals")).toEqual({ kind: "evals", detector: null });
    expect(parseRoute("#/evals/churn_risk")).toEqual({ kind: "evals", detector: "churn_risk" });
  });

  // A URL someone pasted badly lands on the portfolio rather than on nothing.
  it("falls back to the portfolio for anything it does not recognise", () => {
    expect(parseRoute("#/nonsense/here")).toEqual({ kind: "portfolio", company: null });
    expect(parseRoute("#/artefact")).toEqual({ kind: "portfolio", company: null });
  });

  it("round trips every route through its href", () => {
    const routes = [
      { kind: "portfolio", company: null },
      { kind: "portfolio", company: "sayline" },
      { kind: "artefact", company: "sayline" },
      { kind: "evals", detector: null },
      { kind: "evals", detector: "crm_hygiene" },
    ] as const;

    for (const route of routes) expect(parseRoute(hrefFor(route))).toEqual(route);
  });
});
