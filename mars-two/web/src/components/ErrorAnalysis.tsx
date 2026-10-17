import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { formatEurosExact, humanise } from "../lib/format";
import { hrefFor } from "../lib/route";
import type { EvalCase, EvalLedger } from "../lib/types";

/** Verdicts that are not a failure. A match is right, and an unplanted rank is
 *  what a list longer than the planted set is bound to contain. */
const STEADY = new Set(["match", "unplanted"]);

const DETECTORS = [
  { key: "revenue_leakage", label: "Revenue leakage" },
  { key: "crm_hygiene", label: "CRM hygiene" },
  { key: "onboarding_stalls", label: "Onboarding stalls" },
  { key: "churn_risk", label: "Churn risk" },
] as const;

/** Counts, not rates.
 *
 * A rate computed here would be a second implementation of the scoring the
 * platform already did, free to disagree with it. Counting the rows on screen
 * cannot disagree with the rows on screen.
 */
function tally(cases: EvalCase[]) {
  const counts = new Map<string, number>();
  for (const row of cases) counts.set(row.verdict, (counts.get(row.verdict) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function side(entry: EvalCase["planted"] | EvalCase["found"]): string {
  if (!entry) return "not found";

  const parts: string[] = [];
  // "Ranked, rank 7" says the same thing twice. A rank is its own noun.
  if (entry.kind && entry.kind !== "ranked") parts.push(humanise(entry.kind));
  if ("amount_cents" in entry && entry.amount_cents != null) {
    parts.push(formatEurosExact(entry.amount_cents));
  }
  if ("rank" in entry && entry.rank != null) {
    parts.push(`rank ${entry.rank}`);
    if (entry.score != null) parts.push(`score ${entry.score.toFixed(2)}`);
  }
  if ("days_blocked" in entry && entry.days_blocked != null) {
    parts.push(`${entry.days_blocked}d blocked`);
  }
  return parts.join(", ");
}

interface Props {
  detector: string | null;
}

/** A working surface, not a report.
 *
 * The aggregate score says a detector missed six cases. It cannot say that five
 * of the six are one failure mode and the sixth is a bug, and that is the only
 * thing worth knowing. So failures sort to the top and every row names the
 * record it came from, which is what makes a row openable in the database.
 */
export function ErrorAnalysis({ detector }: Props) {
  const [ledger, setLedger] = useState<EvalLedger | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unrecorded, setUnrecorded] = useState(false);

  useEffect(() => {
    setLedger(null);
    setUnrecorded(false);
    api
      .evalCases(detector ?? undefined)
      .then(setLedger)
      .catch((e: Error) => {
        if (e.message.includes("404")) setUnrecorded(true);
        else setError(e.message);
      });
  }, [detector]);

  if (error) {
    return (
      <p className="notice notice--error" role="alert">
        {error}
      </p>
    );
  }

  if (unrecorded) {
    // An empty table and an unrecorded ledger look identical and need different
    // actions, so they are told apart here too.
    return (
      <p className="notice">
        No eval ledger has been recorded. Run <code>bin/rails evals:record</code> in the
        platform.
      </p>
    );
  }

  if (!ledger) return <p className="notice">Loading the eval ledger.</p>;

  const counts = tally(ledger.cases);
  const failures = ledger.cases.filter((row) => !STEADY.has(row.verdict)).length;

  return (
    <section className="evals">
      <header className="evals__head">
        <h2>
          Cases against the answer key
          <span className="evals__meta">
            generator v{ledger.generator_version}, seed {ledger.seed}, as of {ledger.as_of}
          </span>
        </h2>

        <nav className="evals__filters" aria-label="Detector">
          <a
            href={hrefFor({ kind: "evals", detector: null })}
            aria-current={detector === null ? "page" : undefined}
          >
            All
          </a>
          {DETECTORS.map((d) => (
            <a
              key={d.key}
              href={hrefFor({ kind: "evals", detector: d.key })}
              aria-current={detector === d.key ? "page" : undefined}
            >
              {d.label}
            </a>
          ))}
        </nav>

        <p className="evals__counts">
          {counts.map(([verdict, n]) => (
            <span key={verdict} className="evals__count" data-verdict={verdict}>
              {n} {humanise(verdict).toLowerCase()}
            </span>
          ))}
        </p>
      </header>

      {/* Said, not left to be counted off the table. A reader who has to scan
          163 rows to conclude that none of them is wrong will not conclude it. */}
      {ledger.cases.length > 0 && failures === 0 && (
        <p className="evals__verdict">
          No case on this ledger is wrong. Every planted defect was found, with the cause
          and the amount it was planted with.
        </p>
      )}

      {ledger.cases.length === 0 ? (
        <p className="notice">No cases for this detector.</p>
      ) : (
        <table className="cases">
          <caption className="visually-hidden">
            Eval cases, failures first, with the planted answer beside the detector's
          </caption>
          <thead>
            <tr>
              <th scope="col">Case</th>
              <th scope="col">Detector</th>
              <th scope="col">Planted</th>
              <th scope="col">Detector said</th>
              <th scope="col">Grader</th>
            </tr>
          </thead>
          <tbody>
            {ledger.cases.map((row, index) => (
              /* Keyed by position, not by subject. A subject is a human reference
                 and two tables can print the same one: keying on it merged an
                 account with an opportunity once already, in the scoring. */
              <tr key={`${row.detector}:${row.subject}:${index}`} data-verdict={row.verdict}>
                <th scope="row" className="cases__subject">
                  <span
                    className="register__swatch"
                    style={{ background: `var(--co-${row.company})` }}
                  />
                  {row.subject}
                </th>
                <td className="cases__detector">{humanise(row.detector)}</td>
                <td>{row.planted ? side(row.planted) : "—"}</td>
                <td>{side(row.found)}</td>
                <td>
                  <span className="verdict" data-verdict={row.verdict}>
                    {humanise(row.verdict).toLowerCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
