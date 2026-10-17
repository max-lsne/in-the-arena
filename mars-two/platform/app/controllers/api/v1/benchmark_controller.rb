module Api
  module V1
    # One month across the portfolio, ranked where ranking says something true.
    #
    # This is the tool the cross-portfolio agent reads. It exists so that the
    # comparison is arithmetic done in SQL rather than a model putting eight
    # numbers in order, and so that the two comparisons that would mislead come
    # back without a rank at all. See app/lib/metrics/benchmark.rb.
    class BenchmarkController < BaseController
      def index
        render json: ::Metrics::Benchmark.call(keys: requested_keys, period_start: period_start)
      end

      private

      def requested_keys = params[:keys].to_s.split(",").map(&:strip).reject(&:blank?)

      def period_start
        return nil if params[:as_of].blank?

        Date.strptime(params[:as_of], "%Y-%m-%d")
      rescue Date::Error, TypeError
        raise InvalidRequest, "as_of must be an ISO date, for example 2026-09-12"
      end
    end
  end
end
