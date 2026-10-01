module Evals
  # Turns detector scores into something a person reads, and into a comparison
  # against the committed baseline.
  #
  # The comparison is directional. A number moving is not news; a number moving
  # the wrong way is. Reporting both and only failing on the second is what keeps
  # the gate useful rather than something people learn to re-record around.
  module Report
    # Every metric where higher is better. A drift downward in any of these fails
    # the build; a drift upward is reported and celebrated quietly.
    HIGHER_IS_BETTER = %w[
      recall precision amount_accuracy cause_accuracy kind_accuracy step_accuracy
      recall_at_k precision_at_k
    ].freeze

    # Tolerance, because a synthetic portfolio can shift by one record when the
    # generator changes and that is not a regression worth failing on.
    EPSILON = 0.005

    class << self
      def render(scores)
        lines = [ "Detector scores  (generator v#{scores[:generator_version] || scores['generator_version']}, " \
                  "seed #{scores[:seed] || scores['seed']})", "" ]

        fetch(scores, :detectors).each do |name, metrics|
          lines << "  #{name}"
          metrics.sort.each do |key, value|
            next if value.is_a?(Hash)

            lines << format("    %-18s %s", key, value.is_a?(Float) ? format("%.4f", value) : value)
          end
          lines << ""
        end
        lines.join("\n")
      end

      def compare(baseline, current)
        fetch(current, :detectors).flat_map do |detector, metrics|
          was = fetch(baseline, :detectors)[detector.to_s] || {}

          metrics.filter_map do |metric, now|
            next unless HIGHER_IS_BETTER.include?(metric.to_s)

            before = was[metric.to_s]
            next if before.nil? || (now - before).abs <= EPSILON

            { detector: detector, metric: metric, before: before, now: now, worse: now < before }
          end
        end
      end

      def render_drift(drift)
        drift.map do |d|
          format("  %-8s %-18s %-16s %.4f -> %.4f",
                 d[:worse] ? "WORSE" : "better", d[:detector], d[:metric], d[:before], d[:now])
        end.join("\n")
      end

      private

      def fetch(hash, key) = hash[key] || hash[key.to_s] || {}
    end
  end
end
