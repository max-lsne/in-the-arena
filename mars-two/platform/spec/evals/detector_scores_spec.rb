require "rails_helper"
require Rails.root.join("lib/synthetic/generator")

# The eval gate compares today's scores against a committed baseline, so any
# score that moves on its own turns the gate into a nuisance people re-record
# around. The most likely cause is a detector reading the clock.
RSpec.describe Evals::DetectorScores, :seeded do
  before(:context) { Synthetic::Generator.new(usage_days: 70).run! }

  def owner(&) = ApplicationRecord.as_owner(&)

  it "scores every detector" do
    scores = owner { described_class.call }

    expect(scores[:detectors].keys).to match_array(
      %w[revenue_leakage crm_hygiene onboarding_stalls churn_risk]
    )
  end

  it "stamps the generator version and seed onto the result" do
    scores = owner { described_class.call }

    # ADR 0004: changing the generator invalidates every recorded baseline, so a
    # comparison across versions has to be refusable rather than silently wrong.
    expect(scores[:generator_version]).to eq(Synthetic::Generator::VERSION)
    expect(scores[:seed]).to eq(Synthetic::Generator::DEFAULT_SEED)
  end

  it "reports recall and precision separately" do
    scores = owner { described_class.call }

    # Never averaged into one figure. An average lets a detector trade one for
    # the other and keep the same number.
    scores[:detectors].each_value do |metrics|
      next unless metrics.key?(:recall)

      expect(metrics).to include(:recall, :precision, :false_positives, :false_negatives)
    end
  end

  # CRM hygiene once read Date.current directly. Run a month later it flagged 125
  # stale opportunities where 16 were planted, and a year later 923. The gate
  # would have failed on a Tuesday with nobody having changed anything.
  it "produces the same scores whatever day it is run" do
    today = owner { described_class.call }

    travel_to(Date.new(2027, 9, 12)) do
      a_year_later = owner { described_class.call }

      expect(a_year_later[:detectors]).to eq(today[:detectors]),
        "scores moved without any code changing, so something in the scored path reads the clock"
    end
  end

  it "matches the committed baseline" do
    baseline = JSON.parse(Rails.root.join("db/eval_baselines/detectors.json").read)
    drift = Evals::Report.compare(baseline, owner { described_class.call })

    expect(drift.select { |d| d[:worse] }).to be_empty,
      "detectors regressed against the committed baseline: #{Evals::Report.render_drift(drift)}"
  end
end
