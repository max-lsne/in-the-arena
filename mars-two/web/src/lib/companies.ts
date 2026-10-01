/** The eight companies, in a fixed order that never changes.
 *
 * The brief's reason: an operator learns where Meterpath sits in the list and
 * stops reading names. Sorting by a metric would move rows under the cursor
 * every time the data refreshed and destroy that.
 */
export const COMPANY_ORDER = [
  "vaultline",
  "meterpath",
  "northquay",
  "deskwright",
  "sayline",
  "tidyrecord",
  "roomcast",
  "clausemark",
] as const;

export type CompanySlug = (typeof COMPANY_ORDER)[number];

export function hueFor(slug: string): string {
  return `var(--co-${slug})`;
}

export function inFixedOrder<T extends { slug: string }>(companies: T[]): T[] {
  const rank = new Map(COMPANY_ORDER.map((slug, i) => [slug as string, i]));
  return [...companies].sort(
    (a, b) => (rank.get(a.slug) ?? 99) - (rank.get(b.slug) ?? 99),
  );
}
