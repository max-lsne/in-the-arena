module Api
  module V1
    # The value creation plan, with each initiative's claim attached to the
    # metric that would settle it.
    #
    # An initiative that says it will lift retention is a claim. Returning the
    # metric's current value next to the baseline and the target makes the claim
    # checkable, which is the difference between a plan and a status update.
    class InitiativesController < BaseController
      def index
        scope = Initiative.all
        scope = scope.where(company_id: company_from_params!.id) if params[:company].present?
        scope = scope.where(status: params[:status]) if params[:status].present?

        initiatives = scope.includes(:company, :owner_employee).order(:due_on).to_a
        latest = latest_metrics_for(initiatives)

        render json: { initiatives: initiatives.map { |i| serialize(i, latest[[ i.company_id, i.target_metric_key ]]) } }
      end

      private

      # One query for every metric the page needs, rather than one per
      # initiative. Row-level security applies to it like any other read.
      def latest_metrics_for(initiatives)
        keys = initiatives.filter_map(&:target_metric_key).uniq
        return {} if keys.empty?

        MetricValue.where(metric_key: keys)
                   .chronological
                   .index_by { |m| [ m.company_id, m.metric_key ] }
      end

      def serialize(initiative, metric)
        {
          company: initiative.company.slug,
          title: initiative.title,
          thesis: initiative.thesis,
          status: initiative.status,
          owner: initiative.owner_employee&.name,
          due_on: initiative.due_on,
          target: target_for(initiative, metric)
        }
      end

      def target_for(initiative, metric)
        mismatch = unit_mismatch?(initiative, metric)

        {
          metric_key: initiative.target_metric_key,
          baseline_value: initiative.baseline_value&.to_s("F"),
          target_value: initiative.target_value&.to_s("F"),
          target_unit: initiative.target_unit,
          current_value: metric&.value&.to_s("F"),
          unit: metric&.unit,
          measured_at: metric&.period_end,
          unit_mismatch: mismatch,
          progress: mismatch ? nil : progress(initiative, metric)
        }
      end

      # A baseline stated in one unit and a measurement taken in another produce
      # a progress figure that is arithmetically fine and means nothing. Saying
      # the units disagree is more useful than rendering the number.
      def unit_mismatch?(initiative, metric)
        return false if metric.nil? || initiative.target_unit.blank?

        initiative.target_unit != metric.unit
      end

      # Nil rather than zero when there is nothing to measure against. Zero reads
      # as "no movement", which is a finding; nil is the truth, which is that
      # nobody knows yet.
      def progress(initiative, metric)
        return nil if metric.nil? || initiative.baseline_value.nil? || initiative.target_value.nil?

        span = initiative.target_value - initiative.baseline_value
        return nil if span.zero?

        ((metric.value - initiative.baseline_value) / span).to_f.round(4)
      end
    end
  end
end
