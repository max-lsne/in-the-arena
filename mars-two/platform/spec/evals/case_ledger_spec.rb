require "rails_helper"
require Rails.root.join("lib/synthetic/generator")

# The ledger is what someone reads when a score moves. Its properties are that
# every row is attributable to a record, that the counts reconcile with the
# aggregate scores, and that a wrong answer is distinguishable from a missing
# one. Wording is not asserted anywhere.
RSpec.describe Evals::CaseLedger, :seeded do
  before(:context) { Synthetic::Generator.new(usage_days: 70).run! }

  def owner(&) = ApplicationRecord.as_owner(&)

  let(:ledger) { owner { described_class.call } }
  let(:scores) { owner { Evals::DetectorScores.call } }

  it "names the record behind every case" do
    expect(ledger[:cases]).to all(include(:detector, :company, :subject, :verdict))
    expect(ledger[:cases].map { |c| c[:subject] }).to all(be_present)
    expect(ledger[:cases].map { |c| c[:company] }).to all(be_present)
  end

  it "stamps the generator version, seed and as_of" do
    expect(ledger[:generator_version]).to eq(Synthetic::Generator::VERSION)
    expect(ledger[:seed]).to eq(Synthetic::Generator::DEFAULT_SEED)
    expect(ledger[:as_of]).to eq(Evals::DetectorScores::AS_OF.to_s)
  end

  # The ledger and the scores are computed by different code over the same data.
  # If they disagree, one of them is lying, and the point of the ledger is that
  # you can trust it enough to open a row.
  %w[revenue_leakage crm_hygiene onboarding_stalls].each do |detector|
    it "reconciles #{detector} case counts with the aggregate score" do
      rows = ledger[:cases].select { |c| c[:detector] == detector }
      metrics = scores[:detectors][detector]

      expect(rows.count { |c| c[:planted] }).to eq(metrics[:planted])
      expect(rows.count { |c| c[:found] }).to eq(metrics[:flagged])
      expect(rows.count { |c| c[:verdict] == "miss" }).to eq(metrics[:false_negatives])
      expect(rows.count { |c| c[:verdict] == "false_positive" }).to eq(metrics[:false_positives])
    end
  end

  it "puts failures above matches" do
    verdicts = ledger[:cases].map { |c| c[:verdict] }
    expect(verdicts.rindex { |v| v != "match" }).to be < (verdicts.index("match") || verdicts.size) unless verdicts.uniq == [ "match" ]
  end

  # A miss and a wrong answer need different fixes, so they cannot share a
  # verdict. Every row carries whichever sides exist.
  it "distinguishes a missing answer from a wrong one" do
    ledger[:cases].each do |row|
      case row[:verdict]
      when "miss" then expect(row[:found]).to be_nil
      when "false_positive" then expect(row[:planted]).to be_nil
      else
        expect(row[:planted]).to be_present
        expect(row[:found]).to be_present
      end
    end
  end

  it "carries the planted and found cause on a revenue leakage case" do
    row = ledger[:cases].find { |c| c[:detector] == "revenue_leakage" }

    expect(row[:planted]).to include(:kind, :amount_cents)
    expect(row[:found]).to include(:kind, :amount_cents)
  end

  # Scored at the k precision is measured at, not the k recall is measured at.
  # At recall's k every row is planted and the ledger shows nothing.
  it "ranks churn cases out to the precision cut, marking the recall cut" do
    rows = ledger[:cases].select { |c| c[:detector] == "churn_risk" && c[:found] }

    expect(rows.map { |c| c[:found][:rank] }.max).to eq(Evals::DetectorScores::CHURN_PRECISION_K)
    expect(rows.count { |c| c[:found][:within_recall_k] })
      .to eq(Evals::DetectorScores::CHURN_K * owner { Company.count })
  end

  it "reports a detector's failure as cases rather than only as a number" do
    # Break the detector and the rows move with it. A ledger that reports the
    # same cases whatever the detector does is decoration.
    degraded = owner do
      stub_const("Reconciliation::ContractBilling::TOLERANCE_CENTS", 100_000_00)
      described_class.call
    end

    misses = degraded[:cases].count { |c| c[:detector] == "revenue_leakage" && c[:verdict] == "miss" }
    expect(misses).to be_positive
  end
end
