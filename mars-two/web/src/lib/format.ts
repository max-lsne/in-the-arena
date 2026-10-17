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

/** Exact euros, for an artefact.
 *
 * The register rounds to €41k because a column of rounded figures is readable
 * and the exact digits are noise there. An artefact is the opposite: it is the
 * document someone forwards to a finance team, and "about €41k" is not a number
 * anyone can invoice against.
 */
export function formatEurosExact(cents: number): string {
  return `€${(cents / 100).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Machine names, as a person reads them.
 *
 * The platform names causes in snake case because they are keys. Rendering the
 * key would leak an implementation detail into the one screen a finance team
 * reads.
 */
export function humanise(value: string): string {
  const words = value.replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Contract text, rewrapped for the width it is quoted at.
 *
 * The corpus is hard-wrapped at about ninety characters, which is right for a
 * contract and wrong for a 500px evidence column: every line breaks twice and
 * the quote reads as broken rather than as a clause. Joining a continuation
 * line to the one above it changes no words.
 *
 * A line that opens a numbered clause keeps its break, because the numbering is
 * the structure a reader is checking the citation against.
 */
const CLAUSE_OPENER = /^\d+(\.\d+)*\.?\s/;

export function rewrapClause(text: string): string {
  const out: string[] = [];

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line === "") {
      out.push("");
      continue;
    }

    const previous = out[out.length - 1];
    if (previous === undefined || previous === "" || CLAUSE_OPENER.test(line)) out.push(line);
    else out[out.length - 1] = `${previous} ${line}`;
  }

  return out.join("\n").trim();
}
