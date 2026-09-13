import type { Company, MetricValue } from "../lib/types";
import { formatMetric } from "../lib/format";
import { Sparkline } from "./Sparkline";

/** Which direction is good is a property of the metric.
 *
 * Without it, a band flags anything outside it and the colour says "above" or
 * "below" rather than "better" or "worse". 180 open tickets rendered green as
 * "above the band" is a confident wrong signal, which is worse than no signal.
 *
 * The platform now sends `higher_is_better` with every value and that is what is
 * used. These stay as the fallback for a metric the platform has no declaration
 * for, and as the bands, which are a display decision and live here.
 */
const COLUMNS = [
  { key: "arr_cents", label: "ARR", band: null, higherIsBetter: true },
  {
    key: "net_revenue_retention",
    label: "Net rev ret",
    band: { low: 1.0, high: 1.15 },
    higherIsBetter: true,
  },
  {
    key: "gross_churn_rate",
    label: "Gross churn",
    band: { low: 0, high: 0.02 },
    higherIsBetter: false,
  },
  { key: "open_tickets", label: "Open tickets", band: { low: 0, high: 90 }, higherIsBetter: false },
  { key: "pipeline_coverage", label: "Pipeline", band: { low: 3, high: 6 }, higherIsBetter: true },
  { key: "overdue_invoice_cents", label: "Overdue", band: null, higherIsBetter: false },
] as const;

interface Props {
  companies: Company[];
  metrics: MetricValue[];
}

/** One row per company, fixed order, always all of them.
 *
 * Comparison happens down aligned columns, which is the thing a grid of cards
 * cannot do. Steady state carries no colour: a value inside its band renders as
 * plain ink, so the page can be read by shape before any number is read.
 */
export function Register({ companies, metrics }: Props) {
  const series = new Map<string, MetricValue[]>();
  for (const metric of metrics) {
    const key = `${metric.company}:${metric.metric_key}`;
    const existing = series.get(key);
    if (existing) existing.push(metric);
    else series.set(key, [metric]);
  }

  return (
    <table className="register">
      <caption className="visually-hidden">
        Portfolio companies with their latest monthly figures
      </caption>
      <thead>
        <tr>
          <th scope="col" className="register__name">Company</th>
          {COLUMNS.map((column) => (
            <th scope="col" key={column.key}>{column.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {companies.map((company) => (
          <tr key={company.slug}>
            <th scope="row" className="register__name">
              <span className="register__swatch" style={{ background: `var(--co-${company.slug})` }} />
              {company.name}
              {/* Stated next to the company, not hidden in a tooltip. Two of
                  these figures are not comparable with two others, and the
                  definition is the only thing that says so. */}
              <span className="register__definition">{company.arr_definition.replace(/_/g, " ")}</span>
            </th>

            {COLUMNS.map((column) => {
              const points = (series.get(`${company.slug}:${column.key}`) ?? [])
                .slice()
                .sort((a, b) => a.period_start.localeCompare(b.period_start));
              const latest = points[points.length - 1];

              if (!latest) {
                return (
                  <td key={column.key} className="register__value register__value--absent" data-label={column.label}>
                    {/* Absent, not zero. The platform omits a metric it could not
                        compute, and showing a dash keeps that distinction. */}
                    <span aria-label="not computed">—</span>
                  </td>
                );
              }

              const value = Number(latest.value);
              // The platform's declaration wins. The column's is the fallback.
              const higherIsBetter = latest.higher_is_better ?? column.higherIsBetter;
              const outside = column.band
                ? value < column.band.low
                  ? "low"
                  : value > column.band.high
                    ? "high"
                    : null
                : null;
              // Colour says better or worse, never merely higher or lower.
              const breach = outside
                ? (outside === "high") === higherIsBetter
                  ? "above"
                  : "below"
                : null;

              return (
                <td
                  key={column.key}
                  className="register__value"
                  data-breach={breach ?? undefined}
                  data-label={column.label}
                >
                  {column.band && (
                    <Sparkline
                      values={points.map((p) => Number(p.value))}
                      band={column.band}
                      higherIsBetter={higherIsBetter}
                      label={`${column.label} for ${company.name}, last ${points.length} months`}
                    />
                  )}
                  <span className="register__number">{formatMetric(latest.value, latest.unit)}</span>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
