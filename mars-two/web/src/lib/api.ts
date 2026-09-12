import type { Company, MetricValue, ReconciliationFinding } from "./types";

/** The platform is the only source of data, and it holds the tenancy grant.
 *
 * The token decides which companies come back. There is no client-side filtering
 * to get wrong: a caller granted one company receives one company.
 */
const TOKEN = import.meta.env.VITE_MARS_TOKEN ?? "";

async function get<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/json" },
  });

  if (response.status === 401) throw new Error("The platform rejected this token.");
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return (await response.json()) as T;
}

export const api = {
  companies: () => get<{ companies: Company[] }>("/api/v1/companies"),

  metrics: (params: { company?: string; keys?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params.company) query.set("company", params.company);
    if (params.keys) query.set("keys", params.keys);
    query.set("limit", String(params.limit ?? 500));
    return get<{ metrics: MetricValue[] }>(`/api/v1/metrics?${query}`);
  },

  reconciliation: (company?: string) => {
    const query = new URLSearchParams();
    if (company) query.set("company", company);
    return get<{
      findings: ReconciliationFinding[];
      total_findings: number;
      total_shortfall_cents: number;
      currency: string;
    }>(`/api/v1/reconciliation/contract_billing?${query}`);
  },
};
