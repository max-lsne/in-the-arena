export interface Company {
  slug: string;
  name: string;
  country: string;
  vertical: string;
  currency: string;
  arr_cents: number;
  arr_definition: string;
  acquired_on: string | null;
}

export interface MetricValue {
  company: string;
  metric_key: string;
  grain: string;
  period_start: string;
  period_end: string;
  /** A string, because the platform sends a decimal and a float would round it. */
  value: string;
  unit: MetricUnit;
  formula: string;
  input_count: number;
  computed_at: string;
}

export type MetricUnit =
  | "eur_cents"
  | "ratio"
  | "percent"
  | "multiple"
  | "count"
  | "days";

export interface ReconciliationFinding {
  contract_reference: string;
  company: string;
  kinds: string[];
  shortfall_cents: number;
  invoices_checked: number;
  detail: Array<{
    invoice_number: string;
    period_start: string;
    expected_cents: number;
    billed_cents: number;
    billed_currency: string;
    gap_cents: number;
  }>;
}
