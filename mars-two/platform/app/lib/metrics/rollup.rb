module Metrics
  # Computes a company's monthly figures in SQL and stores them in metric_values.
  #
  # This is where the "models never do arithmetic" rule is enforced structurally
  # rather than asked for in a prompt. An agent can only state figures that
  # exist here, each one arriving with the formula that produced it and the
  # number of rows behind it, so an artefact can show its working and a grader
  # can check a stated figure against its source.
  #
  # No tenancy bypass. The rollup computes whatever the current connection can
  # see, so running it under a grant computes only that grant's companies, and
  # the batch job that runs it for everyone establishes owner context itself.
  module Rollup
    GRAIN = "month".freeze

    # zero_when_empty distinguishes "genuinely nothing" from "cannot be known".
    #
    # No overdue invoices really is zero overdue. No onboardings completed this
    # month is not a median of zero days, it is no median at all, and writing 0
    # there hands an agent a figure that reads as "time to value is zero days".
    # Metrics that cannot be known with no inputs are omitted, so absence means
    # absence and an agent has to say it does not know.
    Metric = Struct.new(:unit, :formula, :sql, :zero_when_empty, keyword_init: true)

    METRICS = {
      arr_cents: Metric.new(
        zero_when_empty: true,
        unit: "eur_cents",
        formula: "sum(subscriptions.mrr_cents active at period_end) * 12",
        sql: <<~SQL
          SELECT COALESCE(SUM(mrr_cents), 0) * 12 AS value, COUNT(*) AS input_count
          FROM subscriptions
          WHERE company_id = :company_id
            AND started_on <= :period_end
            AND (ends_on IS NULL OR ends_on > :period_end)
        SQL
      ),

      # Measured on invoices rather than on subscriptions, because invoices are
      # what the customer was actually charged. A subscription record says what
      # was intended; the reconciliation agent exists because those two differ.
      net_revenue_retention: Metric.new(
        zero_when_empty: false,
        unit: "ratio",
        formula: "billed this month / billed twelve months ago, over customers billed twelve months ago",
        sql: <<~SQL
          WITH cohort AS (
            SELECT DISTINCT customer_id FROM invoices
            WHERE company_id = :company_id
              AND period_start BETWEEN :prior_start AND :prior_end
          ),
          now_rev AS (
            SELECT COALESCE(SUM(i.amount_cents), 0) AS v
            FROM invoices i JOIN cohort c ON c.customer_id = i.customer_id
            WHERE i.company_id = :company_id
              AND i.period_start BETWEEN :period_start AND :period_end
          ),
          then_rev AS (
            SELECT COALESCE(SUM(i.amount_cents), 0) AS v
            FROM invoices i JOIN cohort c ON c.customer_id = i.customer_id
            WHERE i.company_id = :company_id
              AND i.period_start BETWEEN :prior_start AND :prior_end
          )
          SELECT
            CASE WHEN then_rev.v = 0 THEN 0
                 ELSE ROUND(now_rev.v::numeric / then_rev.v, 4) END AS value,
            (SELECT COUNT(*) FROM cohort) AS input_count
          FROM now_rev, then_rev
        SQL
      ),

      gross_churn_rate: Metric.new(
        zero_when_empty: false,
        unit: "ratio",
        formula: "customers churned in period / customers active at period start",
        sql: <<~SQL
          SELECT
            CASE WHEN base = 0 THEN 0 ELSE ROUND(churned::numeric / base, 4) END AS value,
            base AS input_count
          FROM (
            SELECT
              (SELECT COUNT(*) FROM customers
                 WHERE company_id = :company_id
                   AND first_seen_on <= :period_start
                   AND (churned_on IS NULL OR churned_on >= :period_start)) AS base,
              (SELECT COUNT(*) FROM customers
                 WHERE company_id = :company_id
                   AND churned_on BETWEEN :period_start AND :period_end) AS churned
          ) t
        SQL
      ),

      # Open at the end of the period, not opened during it. Those are different
      # numbers and conflating them is how a backlog metric reads healthy while
      # the backlog grows.
      open_tickets: Metric.new(
        zero_when_empty: true,
        unit: "count",
        formula: "tickets opened on or before period_end and not closed by period_end",
        sql: <<~SQL
          SELECT COUNT(*) AS value, COUNT(*) AS input_count
          FROM support_tickets
          WHERE company_id = :company_id
            AND opened_at <= :period_end_ts
            AND (closed_at IS NULL OR closed_at > :period_end_ts)
        SQL
      ),

      overdue_invoice_cents: Metric.new(
        zero_when_empty: true,
        unit: "eur_cents",
        formula: "sum(invoices.amount_cents where status = overdue and period_start <= period_end)",
        sql: <<~SQL
          SELECT COALESCE(SUM(amount_cents), 0) AS value, COUNT(*) AS input_count
          FROM invoices
          WHERE company_id = :company_id
            AND status = 'overdue'
            AND period_start <= :period_end
        SQL
      ),

      pipeline_coverage: Metric.new(
        zero_when_empty: false,
        unit: "ratio",
        formula: "open pipeline closing within 90 days / one quarter of current run rate",
        sql: <<~SQL
          SELECT
            CASE WHEN target = 0 THEN 0 ELSE ROUND(pipeline::numeric / target, 4) END AS value,
            opportunities AS input_count
          FROM (
            SELECT
              (SELECT COALESCE(SUM(amount_cents), 0) FROM crm_opportunities
                 WHERE company_id = :company_id
                   AND stage NOT IN ('closed_won', 'closed_lost')
                   AND close_date BETWEEN :period_end AND (:period_end::date + INTERVAL '90 days')) AS pipeline,
              (SELECT COUNT(*) FROM crm_opportunities
                 WHERE company_id = :company_id
                   AND stage NOT IN ('closed_won', 'closed_lost')
                   AND close_date BETWEEN :period_end AND (:period_end::date + INTERVAL '90 days')) AS opportunities,
              (SELECT COALESCE(SUM(mrr_cents), 0) * 3 FROM subscriptions
                 WHERE company_id = :company_id AND status = 'active') AS target
          ) t
        SQL
      ),

      median_onboarding_days: Metric.new(
        zero_when_empty: false,
        unit: "days",
        formula: "median(completed_on - started_on) over onboardings completed in period",
        sql: <<~SQL
          SELECT
            COALESCE(percentile_cont(0.5) WITHIN GROUP (ORDER BY (completed_on - started_on)), 0) AS value,
            COUNT(*) AS input_count
          FROM onboardings
          WHERE company_id = :company_id
            AND completed_on BETWEEN :period_start AND :period_end
        SQL
      )
    }.freeze

    class << self
      def call(company:, months: 12, as_of: Date.current)
        rows = []
        omitted = []

        periods(months, as_of).each do |period|
          written, skipped = compute_period(company, period)
          rows.concat(written)
          omitted.concat(skipped)
        end

        # A metric that has become unknowable since the last run must lose its
        # old row, or a stale figure outlives the data that justified it.
        omitted.each do |period_start, keys|
          MetricValue.where(company_id: company.id, grain: GRAIN,
                            period_start: period_start, metric_key: keys).delete_all
        end

        return 0 if rows.empty?

        # Upsert on the natural key, so rerunning corrects a figure rather than
        # writing a second one next to it. A metrics table that accumulates
        # duplicates reports whichever row a query happens to pick.
        MetricValue.upsert_all(rows, unique_by: :idx_metric_values_unique)
        rows.size
      end

      private

      def periods(months, as_of)
        (0...months).map { |i| (as_of << i).beginning_of_month }.reverse
      end

      def compute_period(company, period_start)
        period_end = period_start.end_of_month
        binds = {
          company_id: company.id,
          period_start: period_start,
          period_end: period_end,
          period_end_ts: period_end.end_of_day,
          prior_start: (period_start << 12),
          prior_end: (period_start << 12).end_of_month
        }

        skipped = []
        written = METRICS.filter_map do |key, metric|
          result = ApplicationRecord.connection.select_one(
            ApplicationRecord.sanitize_sql_array([ metric.sql, binds ])
          )
          input_count = result["input_count"].to_i

          if input_count.zero? && !metric.zero_when_empty
            skipped << key.to_s
            next
          end

          {
            company_id: company.id,
            metric_key: key.to_s,
            grain: GRAIN,
            period_start: period_start,
            period_end: period_end,
            value: result["value"] || 0,
            unit: metric.unit,
            formula: metric.formula,
            input_count: input_count,
            computed_at: Time.current
          }
        end

        [ written, skipped.any? ? [ [ period_start, skipped ] ] : [] ]
      end
    end
  end
end
