module Api
  module V1
    # Where an agent reads figures.
    #
    # Every value is returned with its unit, the formula that produced it and the
    # number of rows behind it. A bare number leaves a model to infer whether
    # 12000000000 is euros, cents or a ratio, and a model that infers will
    # sometimes infer wrong inside a sentence that reads perfectly.
    class MetricsController < BaseController
      def index
        scope = MetricValue.all
        scope = scope.where(company_id: company_from_params!.id) if params[:company].present?
        scope = scope.where(metric_key: requested_keys) if requested_keys.any?
        scope = scope.where(grain: params[:grain]) if params[:grain].present?
        scope = scope.where(period_start: from_date..) if from_date

        # Newest first, then reversed for the caller.
        #
        # The obvious version ordered chronologically and took the first N, which
        # silently drops the most recent months rather than the oldest: six
        # metrics for eight companies over twelve months is 576 rows against a
        # limit of 500, so the front end was rendering August as the latest
        # figure for some companies and September for others, with nothing to
        # say so. An agent asking for sixty values got the sixty oldest.
        rows = scope.order(period_start: :desc, id: :desc).limit(limit).to_a

        render json: {
          metrics: rows.sort_by { |m| [ m.period_start, m.id ] }.map { |m| serialize(m) },
          returned: rows.size,
          total: scope.count,
          truncated: scope.count > rows.size
        }
      end

      private

      MAX_LIMIT = 500

      def requested_keys = params[:keys].to_s.split(",").map(&:strip).reject(&:blank?)

      def limit = [ params.fetch(:limit, MAX_LIMIT).to_i.clamp(1, MAX_LIMIT), MAX_LIMIT ].min

      def from_date
        return nil if params[:from].blank?

        # strptime, not parse. Date.parse("last tuesday") returns a date rather
        # than raising, so a mistyped filter would quietly return a different
        # window than the caller asked for.
        Date.strptime(params[:from], "%Y-%m-%d")
      rescue Date::Error, TypeError
        raise InvalidRequest, "from must be an ISO date, for example 2026-09-01"
      end

      def serialize(metric)
        {
          company: metric.company.slug,
          metric_key: metric.metric_key,
          grain: metric.grain,
          period_start: metric.period_start,
          period_end: metric.period_end,
          value: metric.value.to_s("F"),
          unit: metric.unit,
          # Which direction is good is a property of the metric, and every reader
          # needs it: a display that colours a value, an agent that calls a
          # number an improvement, a benchmark that puts eight of them in order.
          # Sent with the value so nobody has to keep a second copy of it.
          higher_is_better: Metrics::Rollup::METRICS[metric.metric_key.to_sym]&.higher_is_better,
          formula: metric.formula,
          input_count: metric.input_count,
          computed_at: metric.computed_at
        }
      end
    end
  end
end
