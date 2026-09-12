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

        render json: { metrics: scope.chronological.limit(limit).map { |m| serialize(m) } }
      end

      private

      MAX_LIMIT = 500

      def requested_keys = params[:keys].to_s.split(",").map(&:strip).reject(&:blank?)

      def limit = [ params.fetch(:limit, MAX_LIMIT).to_i.clamp(1, MAX_LIMIT), MAX_LIMIT ].min

      def from_date
        return nil if params[:from].blank?

        Date.parse(params[:from])
      rescue Date::Error
        raise InvalidRequest, "from must be a date"
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
          formula: metric.formula,
          input_count: metric.input_count,
          computed_at: metric.computed_at
        }
      end
    end
  end
end
