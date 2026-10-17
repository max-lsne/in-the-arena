import type { Company } from "../lib/types";
import { formatEuros, share } from "../lib/format";
import { hueFor } from "../lib/companies";

interface Props {
  companies: Company[];
  selected: string | null;
  onSelect: (slug: string | null) => void;
}

/** The one bold element, doing three jobs.
 *
 * It states the portfolio total, shows the concentration behind it, and is the
 * navigation. Concentration is what a holding company actually watches, and a
 * proportional band says it without a sentence. This replaces the row of KPI
 * tiles that a dashboard opens with by default, and carries more in less height.
 */
export function ArrBand({ companies, selected, onSelect }: Props) {
  const total = companies.reduce((sum, c) => sum + c.arr_cents, 0);

  return (
    <section className="band" aria-labelledby="band-total">
      <h1 id="band-total" className="band__total">
        {formatEuros(total)} ARR
        <span className="band__caption">
          {companies.length} {companies.length === 1 ? "company" : "companies"}
        </span>
      </h1>

      <div className="band__track" role="group" aria-label="Companies by share of portfolio ARR">
        {companies.map((company) => {
          const width = share(company.arr_cents, total) * 100;
          const isSelected = selected === company.slug;

          return (
            <button
              key={company.slug}
              type="button"
              className="band__segment"
              style={{ width: `${width}%`, background: hueFor(company.slug) }}
              aria-pressed={isSelected}
              data-selected={isSelected || undefined}
              onClick={() => onSelect(isSelected ? null : company.slug)}
            >
              {/* The name is for assistive technology and for wide screens; the
                  segment itself is the information. */}
              <span className="band__label">{company.name}</span>
              <span className="visually-hidden">
                {formatEuros(company.arr_cents)}, {width.toFixed(1)} percent of the portfolio
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
