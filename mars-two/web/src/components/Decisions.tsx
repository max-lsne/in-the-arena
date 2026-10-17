import { formatEurosExact, humanise } from "../lib/format";
import { hrefFor } from "../lib/route";
import type { Company, ReconciliationFinding } from "../lib/types";

interface Props {
  companies: Company[];
  findings: ReconciliationFinding[];
}

/** What the register cannot say.
 *
 * A row shows that a figure is outside its band. It does not say what to do
 * about it. Each line here is a finding with an owner, an amount and an
 * artefact behind it, which is the difference between a dashboard and an
 * operating system.
 */
export function Decisions({ companies, findings }: Props) {
  const byCompany = new Map<string, ReconciliationFinding[]>();
  for (const finding of findings) {
    const existing = byCompany.get(finding.company);
    if (existing) existing.push(finding);
    else byCompany.set(finding.company, [finding]);
  }

  const rows = companies
    .map((company) => ({
      company,
      // Largest first, so naming found[0] names the one worth opening. The
      // platform already sorts this way; sorting again here means the line does
      // not depend on it.
      found: (byCompany.get(company.slug) ?? [])
        .slice()
        .sort((a, b) => b.shortfall_cents - a.shortfall_cents),
    }))
    .filter((row) => row.found.length > 0)
    .sort(
      (a, b) =>
        b.found.reduce((n, f) => n + f.shortfall_cents, 0) -
        a.found.reduce((n, f) => n + f.shortfall_cents, 0),
    );

  if (rows.length === 0) return null;

  return (
    <section className="decisions">
      <h2>Needs a decision</h2>
      <ul>
        {rows.map(({ company, found }) => (
          <li key={company.slug}>
            <a className="decision" href={hrefFor({ kind: "artefact", company: company.slug })}>
              <span className="decision__company">
                <span
                  className="register__swatch"
                  style={{ background: `var(--co-${company.slug})` }}
                />
                {company.name}
              </span>
              <span className="decision__what">
                {/* Eight lines reading "4 contracts billing below the contracted
                    amount" carry one word of information between them. Naming
                    the largest and its cause makes the line worth its row. */}
                {found.length} contract{found.length === 1 ? "" : "s"} below contract.
                Largest {found[0]!.contract_reference},{" "}
                {found[0]!.kinds.map(humanise).join(", ").toLowerCase() || "cause unattributed"}
              </span>
              <span className="decision__amount">
                {formatEurosExact(found.reduce((n, f) => n + f.shortfall_cents, 0))}
              </span>
              <span className="decision__open">open</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
