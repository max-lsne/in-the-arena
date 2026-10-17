import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { formatEurosExact, humanise, rewrapClause } from "../lib/format";
import type { Company, ReconciliationFinding, RetrievalHit } from "../lib/types";

/** The clause to look for, per cause. An explicit lookup, not a guess.
 *
 * A model could be asked to phrase this query. It would phrase it differently
 * on different runs, and the citation under a figure would move with it. The
 * causes are a closed set of four, so the queries are a table of four.
 */
const CLAUSE_QUERIES: Record<string, string> = {
  uplift_not_applied:
    "the Annual Fee shall increase on each anniversary of the Commencement Date",
  seat_growth_unbilled:
    "where the actual user count exceeds the Committed User Count the Supplier shall invoice the excess",
  expired_discount_still_applied:
    "the introductory discount applies until, after that date the full Annual Fee applies",
  currency_mismatch:
    "all amounts under this Agreement are stated and payable in the contract currency",
};

const FALLBACK_QUERY = "fees payable under this Agreement";

interface Props {
  company: Company;
}

/** Contract to billing, for one company.
 *
 * Evidence is the right-hand column rather than a disclosure, because an
 * artefact whose evidence is hidden gets trusted without being checked. Every
 * figure on the left is reachable from something on the right: the clause that
 * was breached, and the invoices that breached it.
 *
 * The arithmetic happened in SQL before this screen existed. What a model adds
 * here is the reading of the clause, and it adds it to a figure it cannot
 * change.
 */
export function Artefact({ company }: Props) {
  const [findings, setFindings] = useState<ReconciliationFinding[] | null>(null);
  const [total, setTotal] = useState(0);
  const [openRef, setOpenRef] = useState<string | null>(null);
  const [clause, setClause] = useState<RetrievalHit | null>(null);
  const [clauseState, setClauseState] = useState<"loading" | "ready" | "absent">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFindings(null);
    setOpenRef(null);
    api
      .reconciliation(company.slug)
      .then((payload) => {
        setFindings(payload.findings);
        setTotal(payload.total_shortfall_cents);
        setOpenRef(payload.findings[0]?.contract_reference ?? null);
      })
      .catch((e: Error) => setError(e.message));
  }, [company.slug]);

  const open = findings?.find((f) => f.contract_reference === openRef) ?? null;

  useEffect(() => {
    if (!open) return;
    let current = true;
    setClauseState("loading");
    setClause(null);

    // An unattributed finding still gets evidence: the fee clause, which is
    // in every contract. Silence in the evidence column is the one outcome
    // this view must not produce.
    const cause = open.kinds[0];
    const query = (cause ? CLAUSE_QUERIES[cause] : undefined) ?? FALLBACK_QUERY;
    api
      .clause(open.contract_reference, query)
      .then((payload) => {
        if (!current) return;
        const hit = payload.results[0] ?? null;
        setClause(hit);
        setClauseState(hit ? "ready" : "absent");
      })
      .catch(() => current && setClauseState("absent"));

    return () => {
      current = false;
    };
  }, [open]);

  if (error) {
    return (
      <p className="notice notice--error" role="alert">
        {error}
      </p>
    );
  }

  if (findings === null) return <p className="notice">Reconciling contracts against invoices.</p>;

  if (findings.length === 0) {
    return (
      <section className="artefact">
        <header className="artefact__head">
          <h2>Contract to billing, {company.name}</h2>
        </header>
        {/* Refusal beats invention. Nothing found is a result, and it is stated
            as one rather than rendered as an empty table. */}
        <p className="notice">
          Every {company.name} contract is billing what it says it should. Nothing to
          correct.
        </p>
      </section>
    );
  }

  return (
    <section className="artefact">
      <header className="artefact__head">
        <h2>Contract to billing, {company.name}</h2>
        <p className="artefact__lede">
          {findings.length} contract{findings.length === 1 ? " is" : "s are"} billing below
          the contracted amount. {formatEurosExact(total)} in total, across{" "}
          {findings.reduce((n, f) => n + f.invoices_checked, 0)} invoices checked.
        </p>
      </header>

      <div className="artefact__body">
        <ol className="claims">
          {findings.map((finding) => (
            <li key={finding.contract_reference}>
              <button
                type="button"
                className="claim"
                aria-pressed={finding.contract_reference === openRef}
                onClick={() => setOpenRef(finding.contract_reference)}
              >
                <span className="claim__ref">{finding.contract_reference}</span>
                <span className="claim__cause">
                  {finding.kinds.map(humanise).join(", ") || "Unattributed"}
                </span>
                <span className="claim__amount">{formatEurosExact(finding.shortfall_cents)}</span>
              </button>
            </li>
          ))}
        </ol>

        <aside className="evidence" aria-label="Evidence">
          <h3>Evidence</h3>

          {open && (
            <>
              <div className="evidence__block">
                <p className="evidence__cite">
                  {open.contract_reference}
                  {clause?.section_ref ? ` s.${clause.section_ref}` : ""}
                </p>
                {clauseState === "loading" && <p className="evidence__quiet">Finding the clause.</p>}
                {/* An empty evidence column reads as "no evidence needed". It is
                    said instead. */}
                {clauseState === "absent" && (
                  <p className="evidence__quiet">
                    No clause in the corpus matches this contract. The figures below stand on
                    the invoices alone.
                  </p>
                )}
                {clauseState === "ready" && clause && (
                  <blockquote className="evidence__quote">{rewrapClause(clause.content)}</blockquote>
                )}
              </div>

              <div className="evidence__block">
                <p className="evidence__cite">
                  Invoices, expected against billed
                </p>
                {/* Its own scroller. A table of five money columns cannot fit a
                    400px screen, and the page body must not scroll sideways to
                    make it. */}
                <div className="evidence__scroll">
                  <table className="evidence__table">
                    <thead>
                      <tr>
                        <th scope="col">Invoice</th>
                        <th scope="col">Period</th>
                        <th scope="col">Expected</th>
                        <th scope="col">Billed</th>
                        <th scope="col">Gap</th>
                      </tr>
                    </thead>
                    <tbody>
                      {open.detail.map((line) => (
                        <tr key={line.invoice_number}>
                          <td>{line.invoice_number}</td>
                          <td>{line.period_start}</td>
                          <td>{formatEurosExact(line.expected_cents)}</td>
                          <td>
                            {formatEurosExact(line.billed_cents)}
                            {/* Stated, never converted silently. A dollar invoice
                                against a euro contract is the finding, not a
                                formatting detail. */}
                            {line.billed_currency !== "EUR" && (
                              <span className="evidence__currency"> {line.billed_currency}</span>
                            )}
                          </td>
                          <td>{formatEurosExact(line.gap_cents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="evidence__provenance">
                Computed in SQL from the contract terms and {open.invoices_checked} invoices.
                No figure on this page was produced by a model.
              </p>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
