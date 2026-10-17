module Synthetic
  # The eight portfolio companies.
  #
  # Fictional, and shaped after the real Aries Global portfolio: European,
  # founder-led, Microsoft-ecosystem B2B SaaS, single-digit to low-double-digit
  # millions of ARR. Headline ARR sums to exactly EUR 70.0M.
  #
  # The arr_definition column is the point of the exercise. These eight disagree
  # about what counts as recurring revenue, which is why a group operator cannot
  # simply add up eight numbers, and why the benchmark agent has real work to do.
  module Portfolio
    COMPANIES = [
      {
        slug: "vaultline", name: "Vaultline", country: "FR",
        vertical: "access_security", arr_cents: 12_000_000_00,
        arr_definition: "contracted_arr", founded_year: 2009, acquired_on: "2025-03-18",
        customer_count: 110, usage_metric: "protected_sessions",
        plans: [ "Gatekeeper Standard", "Gatekeeper Enterprise", "Ledger Audit" ],
        segments: %w[public_sector healthcare finance manufacturing],
        seat_band: (40..1200), churn_rate: 0.06
      },
      {
        slug: "meterpath", name: "Meterpath", country: "LV",
        vertical: "marketplace_billing", arr_cents: 14_500_000_00,
        arr_definition: "booked_acv", founded_year: 2014, acquired_on: "2025-06-02",
        customer_count: 70, usage_metric: "billed_subscriptions",
        plans: [ "Distributor", "Reseller Pro", "Vendor Direct" ],
        segments: %w[distributor msp vendor],
        seat_band: (200..8000), churn_rate: 0.04
      },
      {
        slug: "northquay", name: "Northquay", country: "IT",
        vertical: "strategic_portfolio_management", arr_cents: 8_200_000_00,
        arr_definition: "contracted_arr", founded_year: 2011, acquired_on: "2025-11-07",
        customer_count: 55, usage_metric: "active_plans",
        plans: [ "SPM Core", "SPM Enterprise", "Adaptive PPM" ],
        segments: %w[energy banking pharma telecom],
        seat_band: (80..2500), churn_rate: 0.05
      },
      {
        slug: "deskwright", name: "Deskwright", country: "NL",
        vertical: "digital_workplace", arr_cents: 11_000_000_00,
        arr_definition: "annualised_mrr", founded_year: 2012, acquired_on: "2025-01-24",
        customer_count: 140, usage_metric: "active_seats",
        plans: [ "Workspace Essentials", "Workspace Plus", "Workspace Enterprise" ],
        segments: %w[msp education logistics retail],
        seat_band: (25..3000), churn_rate: 0.09
      },
      {
        slug: "sayline", name: "Sayline", country: "ES",
        vertical: "conversational_engagement", arr_cents: 6_400_000_00,
        arr_definition: "annualised_mrr", founded_year: 2016, acquired_on: "2025-06-13",
        customer_count: 90, usage_metric: "conversations",
        plans: [ "Conversations Growth", "Conversations Scale" ],
        segments: %w[retail travel utilities insurance],
        seat_band: (10..400), churn_rate: 0.11
      },
      {
        slug: "tidyrecord", name: "Tidyrecord", country: "GB",
        vertical: "data_quality", arr_cents: 5_100_000_00,
        arr_definition: "contracted_arr", founded_year: 2007, acquired_on: "2026-02-11",
        customer_count: 65, usage_metric: "records_processed",
        plans: [ "Cleanse", "Cleanse + Match", "Enterprise Data Quality" ],
        segments: %w[finance charity retail public_sector],
        seat_band: (15..600), churn_rate: 0.07
      },
      {
        slug: "roomcast", name: "Roomcast", country: "DK",
        vertical: "workspace_booking", arr_cents: 7_300_000_00,
        arr_definition: "annualised_mrr", founded_year: 2010, acquired_on: "2026-04-29",
        customer_count: 120, usage_metric: "rooms_booked",
        plans: [ "Rooms", "Rooms + Signage", "Campus" ],
        segments: %w[professional_services education manufacturing public_sector],
        seat_band: (20..1500), churn_rate: 0.08
      },
      {
        slug: "clausemark", name: "Clausemark", country: "DE",
        vertical: "contract_lifecycle", arr_cents: 5_500_000_00,
        arr_definition: "booked_acv", founded_year: 2015, acquired_on: "2026-07-15",
        customer_count: 45, usage_metric: "contracts_managed",
        plans: [ "CLM Team", "CLM Enterprise" ],
        segments: %w[legal pharma construction energy],
        seat_band: (12..800), churn_rate: 0.06
      }
    ].freeze

    TOTAL_ARR_CENTS = COMPANIES.sum { |c| c[:arr_cents] }

    def self.total_arr_euros = TOTAL_ARR_CENTS / 100.0
  end
end
