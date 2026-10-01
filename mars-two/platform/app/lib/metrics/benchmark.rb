module Metrics
  # Compares one month across the portfolio, and refuses to compare what should
  # not be compared.
  #
  # Ranking is arithmetic, so it happens here rather than in a model. The more
  # important half is the refusal. Two of these figures cannot be put in order
  # without saying something false:
  #
  # ARR, because the eight companies use three different definitions of it. A
  # league table of contracted ARR against annualised MRR against booked ACV is
  # a table of three different quantities.
  #
  # Absolute counts, because they scale with company size. Meterpath having more
  # open tickets than Tidyrecord is a fact about headcount, not about service.
  #
  # For those, values come back with each company's definition attached and no
  # rank and no median, so there is no number for an agent to quote as a
  # standing. An endpoint that returned the rank anyway would be inviting the
  # sentence it should prevent.
  module Benchmark
    NOT_COMPARABLE = {
      "arr_cents" => "the eight companies use three different definitions of ARR, " \
                     "so these figures are not like for like",
      "overdue_invoice_cents" => "an absolute amount scales with company size; " \
                                 "compare it against that company's own history instead",
      "open_tickets" => "an absolute count scales with company size; " \
                        "compare it against that company's own history instead"
    }.freeze

    class << self
      def call(keys: nil, period_start: nil)
        wanted = Array(keys).map(&:to_s).reject(&:blank?)
        wanted = Metrics::Rollup::METRICS.keys.map(&:to_s) if wanted.empty?

        { period_start: period_start, metrics: wanted.index_with { |key| for_key(key, period_start) } }
      end

      private

      def for_key(key, period_start)
        rows = latest_rows(key, period_start)
        return { available: false, reason: "no value has been computed for #{key}" } if rows.empty?

        reason = NOT_COMPARABLE[key]
        entries = rows.map { |row| entry(row) }

        # Rank by good, not by big. First place on gross churn would otherwise
        # mean the worst churn in the portfolio, and an agent writing
        # "Clausemark ranks first on churn" would be writing praise.
        higher_is_better = Metrics::Rollup::METRICS.fetch(key.to_sym).higher_is_better

        base = {
          available: true,
          unit: rows.first.unit,
          formula: rows.first.formula,
          period_start: rows.first.period_start,
          higher_is_better: higher_is_better,
          comparable: reason.nil?,
          companies: reason ? entries : ranked(entries, higher_is_better)
        }
        reason ? base.merge(not_comparable_because: reason) : base.merge(portfolio_median: median(entries))
      end

      # One row per company: the most recent month that company has a value for,
      # at or before period_start. Companies do not all finish a month together,
      # and taking a single global period would silently drop whoever is late.
      def latest_rows(key, period_start)
        scope = MetricValue.monthly.for_key(key).includes(:company)
        scope = scope.where(period_start: ..period_start) if period_start

        scope.group_by(&:company_id).filter_map { |_, values| values.max_by(&:period_start) }
             .sort_by { |row| row.company.slug }
      end

      # value_millions exists so that "EUR 5.5M" is a figure a tool returned.
      #
      # Prose rounds. An artefact that says 5.5 when the tool said 549999996 is
      # rounding rather than inventing, but the validator cannot tell those apart
      # without allowing arbitrary rescaling, which would let a genuinely
      # invented number through. So the rounding is precomputed here and the
      # check stays strict. Same rule as everywhere else: if a model needs a
      # number, something else computes it.
      def entry(row)
        {
          company: row.company.slug,
          value: row.value.to_s("F"),
          value_millions: millions(row),
          period_start: row.period_start,
          input_count: row.input_count,
          arr_definition: row.company.arr_definition
        }.compact
      end

      def millions(row)
        return nil unless row.unit == "eur_cents"

        (row.value / 100_000_000).round(1).to_s("F")
      end

      def ranked(entries, higher_is_better)
        sign = higher_is_better ? -1 : 1
        ordered = entries.sort_by { |e| BigDecimal(e[:value]) * sign }
        ordered.each_with_index.map { |e, index| e.merge(rank: index + 1, of: ordered.size) }
      end

      def median(entries)
        values = entries.map { |e| BigDecimal(e[:value]) }.sort
        middle = values.size / 2
        result = values.size.odd? ? values[middle] : (values[middle - 1] + values[middle]) / 2
        result.round(4).to_s("F")
      end
    end
  end
end
