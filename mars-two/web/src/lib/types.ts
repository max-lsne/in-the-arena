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

export interface RetrievalHit {
  company: string;
  cite: string;
  document_title: string;
  source_ref: string | null;
  kind: string;
  section_ref: string | null;
  position: number;
  content: string;
}

export type Verdict =
  | "match"
  /** A ranking listed an account the answer key did not plant. Not a wrong
   *  flag: with five planted per company and a list of ten, half the list is
   *  unplanted before the detector runs. */
  | "unplanted"
  | "miss"
  | "false_positive"
  | "wrong_cause"
  | "wrong_amount"
  | "wrong_step"
  | "wrong_kind";

export interface EvalCase {
  detector: string;
  company: string;
  subject: string;
  verdict: Verdict;
  planted: { kind?: string; amount_cents?: number } | null;
  found: {
    kind?: string;
    amount_cents?: number;
    rank?: number;
    score?: number;
    within_recall_k?: boolean;
    days_blocked?: number;
  } | null;
}

export interface EvalLedger {
  generator_version: string;
  seed: number;
  as_of: string;
  cases: EvalCase[];
  verdicts: Record<string, number>;
}
