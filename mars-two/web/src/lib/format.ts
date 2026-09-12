import type { MetricUnit } from "./types";

/** Formats a metric using the unit the platform sent with it.
 *
 * Never guesses. The platform ships every figure with its unit precisely so
 * nothing downstream has to infer whether 1097197248 is euros or cents, and a
 * display that guessed would undo that at the last step. An unrecognised unit
 * renders the raw value rather than inventing a plausible one.
 */
export function formatMetric(value: string, unit: MetricUnit | string): string {
  // Number("") is 0, and Number("  ") is 0, so an absent value would render as
  // a measurement of zero. That is the same failure the rollups avoid by
  // omitting metrics they cannot compute, arriving at the last step in the
  // chain.
  if (value == null || value.trim() === "") return "—";

  const n = Number(value);
  if (!Number.isFinite(n)) return "—";

  switch (unit) {
    case "eur_cents":
      return formatEuros(n);
    case "ratio":
      return `${(n * 100).toFixed(1)}%`;
    case "multiple":
      return `${n.toFixed(1)}x`;
    case "percent":
      return `${n.toFixed(1)}%`;
    case "count":
      return Math.round(n).toLocaleString("en-GB");
    case "days":
      return `${n.toFixed(0)}d`;
    default:
      return value;
  }
}

export function formatEuros(cents: number): string {
  const euros = cents / 100;
  if (Math.abs(euros) >= 1_000_000) return `€${(euros / 1_000_000).toFixed(1)}M`;
  if (Math.abs(euros) >= 1_000) return `€${Math.round(euros / 1000)}k`;
  return `€${euros.toFixed(0)}`;
}

/** Share of a whole, for the band. */
export function share(part: number, whole: number): number {
  return whole === 0 ? 0 : part / whole;
}
