import { useEffect, useState } from "react";
import { api } from "./lib/api";
import { inFixedOrder } from "./lib/companies";
import { hrefFor, parseRoute, type Route } from "./lib/route";
import type { Company, MetricValue, ReconciliationFinding } from "./lib/types";
import { ArrBand } from "./components/ArrBand";
import { Artefact } from "./components/Artefact";
import { Decisions } from "./components/Decisions";
import { ErrorAnalysis } from "./components/ErrorAnalysis";
import { Register } from "./components/Register";

const TRACKED = [
  "arr_cents",
  "net_revenue_retention",
  "gross_churn_rate",
  "open_tickets",
  "pipeline_coverage",
  "overdue_invoice_cents",
].join(",");

function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return route;
}

export function App() {
  const route = useRoute();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [metrics, setMetrics] = useState<MetricValue[]>([]);
  const [findings, setFindings] = useState<ReconciliationFinding[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      api.companies(),
      api.metrics({ keys: TRACKED, limit: 500 }),
      api.reconciliation(),
    ])
      .then(([c, m, r]) => {
        setCompanies(inFixedOrder(c.companies));
        setMetrics(m.metrics);
        setFindings(r.findings);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoaded(true));
  }, []);

  const selected = route.kind === "portfolio" ? route.company : null;
  const shown = selected ? companies.filter((c) => c.slug === selected) : companies;
  const open = route.kind === "artefact" ? companies.find((c) => c.slug === route.company) : null;

  return (
    <main className="page">
      <nav className="chrome" aria-label="Views">
        <a href={hrefFor({ kind: "portfolio", company: null })}
           aria-current={route.kind !== "evals" ? "page" : undefined}>
          Portfolio
        </a>
        <a href={hrefFor({ kind: "evals", detector: null })}
           aria-current={route.kind === "evals" ? "page" : undefined}>
          Error analysis
        </a>
      </nav>

      {error && (
        /* Errors explain what happened and what to do. They do not apologise. */
        <p className="notice notice--error" role="alert">
          {error} Check that the platform is running on port 3000 and that
          VITE_MARS_TOKEN is set.
        </p>
      )}

      {loaded && !error && companies.length === 0 && (
        <p className="notice">
          This token has no companies granted to it. Ask a group operator for access.
        </p>
      )}

      {route.kind === "evals" && <ErrorAnalysis detector={route.detector} />}

      {route.kind !== "evals" && companies.length > 0 && (
        <>
          <ArrBand
            companies={companies}
            selected={route.kind === "artefact" ? route.company : selected}
            onSelect={(slug) => {
              window.location.hash = hrefFor({ kind: "portfolio", company: slug });
            }}
          />

          {route.kind === "artefact" &&
            (open ? (
              <Artefact company={open} />
            ) : (
              /* A slug that is not in the grant is not an error to apologise
                 for. The caller simply cannot see that company. */
              <p className="notice">
                No company called {route.company} is granted to this token.{" "}
                <a href={hrefFor({ kind: "portfolio", company: null })}>Back to the portfolio</a>.
              </p>
            ))}

          {route.kind === "portfolio" &&
            (loaded && metrics.length === 0 ? (
              /* A register of dashes says "every figure is missing" when the truth
                 is "nothing has been computed yet", and those need different
                 actions. */
              <p className="notice">
                No figures have been computed for this portfolio yet. Run{" "}
                <code>bin/rails metrics:rollup</code> in the platform to compute them.
              </p>
            ) : (
              <>
                <Register companies={shown} metrics={metrics} />
                <Decisions companies={shown} findings={findings} />
              </>
            ))}
        </>
      )}
    </main>
  );
}
