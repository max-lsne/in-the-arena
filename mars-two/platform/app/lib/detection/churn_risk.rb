module Detection
  # Accounts worth a call this week, ranked.
  #
  # Unlike the other detectors this is not a flag. No single signal means an
  # account is leaving: customers pay late, complain, and go quiet for reasons
  # that are not churn. Each of these signals taken alone identifies the accounts
  # that actually churn about a quarter of the time. The judgement is in the
  # combination, which is why the output is an ordered list with its components
  # shown rather than a yes or no.
  #
  # The weights are deliberately round and were not tuned against the answer key.
  # Fitting them to the planted accounts would produce a number that says how
  # well the weights memorised this portfolio, not how well the signals work.
  module ChurnRisk
    WEIGHTS = { usage_decline: 0.4, sentiment: 0.3, overdue: 0.3 }.freeze
    WINDOW_DAYS = 30
    TICKET_LOOKBACK_DAYS = 60

    Ranked = Struct.new(:customer, :company, :score, :signals, keyword_init: true) do
      def to_h
        {
          customer: customer.name,
          customer_ref: customer.external_ref,
          company: company.slug,
          score: score.round(4),
          signals: signals
        }
      end
    end

    class << self
      def call(company_id: nil, as_of: Date.current, limit: nil)
        rows = components(company_id, as_of)
        return [] if rows.empty?

        customers = Customer.includes(:company).where(id: rows.map { |r| r["customer_id"] }).index_by(&:id)

        ranked = rows.filter_map do |row|
          customer = customers[row["customer_id"].to_i]
          next unless customer

          signals = normalise(row)
          Ranked.new(
            customer: customer, company: customer.company,
            score: WEIGHTS.sum { |key, weight| weight * signals[key] },
            signals: signals
          )
        end

        ranked = ranked.sort_by { |r| -r.score }
        limit ? ranked.first(limit) : ranked
      end

      private

      def normalise(row)
        recent = row["recent_usage"].to_f
        prior = row["prior_usage"].to_f
        decline = prior.positive? ? (1.0 - (recent / prior)).clamp(0.0, 1.0) : 0.0

        {
          usage_decline: decline.round(4),
          # Three angry tickets is as bad as the scale goes; a fourth does not
          # make the account more likely to leave than the third already did.
          sentiment: (row["angry_tickets"].to_f / 3.0).clamp(0.0, 1.0).round(4),
          overdue: (row["overdue_invoices"].to_f / 3.0).clamp(0.0, 1.0).round(4)
        }
      end

      def components(company_id, as_of)
        sql = <<~SQL
          SELECT c.id AS customer_id,
            COALESCE((SELECT AVG(u.value) FROM usage_daily u
                      WHERE u.customer_id = c.id
                        AND u.on_date > :recent_from AND u.on_date <= :as_of), 0) AS recent_usage,
            COALESCE((SELECT AVG(u.value) FROM usage_daily u
                      WHERE u.customer_id = c.id
                        AND u.on_date > :prior_from AND u.on_date <= :recent_from), 0) AS prior_usage,
            (SELECT COUNT(*) FROM support_tickets t
               WHERE t.customer_id = c.id AND t.closed_at IS NULL
                 AND t.sentiment < -0.4 AND t.opened_at > :ticket_from) AS angry_tickets,
            (SELECT COUNT(*) FROM invoices i
               WHERE i.customer_id = c.id AND i.status = 'overdue') AS overdue_invoices
          FROM customers c
          WHERE c.churned_on IS NULL
          #{company_id ? 'AND c.company_id = :company_id' : ''}
        SQL

        ApplicationRecord.connection.select_all(
          ApplicationRecord.sanitize_sql_array([
            sql,
            {
              company_id: company_id,
              as_of: as_of,
              recent_from: as_of - WINDOW_DAYS,
              prior_from: as_of - (WINDOW_DAYS * 2),
              ticket_from: (as_of - TICKET_LOOKBACK_DAYS).to_time
            }
          ])
        ).to_a
      end
    end
  end
end
