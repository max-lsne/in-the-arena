import { useEffect, useState } from "react";
import { api } from "./lib/api";
import { inFixedOrder } from "./lib/companies";
import type { Company, MetricValue } from "./lib/types";
import { ArrBand } from "./components/ArrBand";
import { Register } from "./components/Register";

const TRACKED = [
  "arr_cents",
  "net_revenue_retention",
  "gross_churn_rate",
  "open_tickets",
  "pipeline_coverage",
  "overdue_invoice_cents",
].join(",");

export function App() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [metrics, setMetrics] = useState<MetricValue[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([api.companies(), api.metrics({ keys: TRACKED, limit: 500 })])
      .then(([c, m]) => {
        setCompanies(inFixedOrder(c.companies));
        setMetrics(m.metrics);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoaded(true));
  }, []);

  const shown = selected ? companies.filter((c) => c.slug === selected) : companies;

  return (
    <main className="page">
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

      {companies.length > 0 && (
        <>
          <ArrBand companies={companies} selected={selected} onSelect={setSelected} />

          {loaded && metrics.length === 0 ? (
            /* A register of dashes says "every figure is missing" when the truth
               is "nothing has been computed yet", and those need different
               actions. */
            <p className="notice">
              No figures have been computed for this portfolio yet. Run{" "}
              <code>bin/rails metrics:rollup</code> in the platform to compute them.
            </p>
          ) : (
            <Register companies={shown} metrics={metrics} />
          )}
        </>
      )}
    </main>
  );
}
