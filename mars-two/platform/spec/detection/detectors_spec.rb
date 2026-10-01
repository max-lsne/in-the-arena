require "rails_helper"
require Rails.root.join("lib/synthetic/generator")

# The detectors that need no model, scored against the planted answer key.
#
# Each was built the same way and each taught the same lesson twice over: a
# detector can only be measured against a clean baseline. Every time one of these
# flagged far more than was planted, the detector was right and the synthetic
# data was wrong, which is the harder failure to notice because it looks like a
# precision problem.
RSpec.describe "Detectors", :seeded do
  before(:context) { Synthetic::Generator.new(usage_days: 14).run! }

  def owner(&) = ApplicationRecord.as_owner(&)
  def planted(klass) = owner { GroundTruth.where(defect_class: klass).to_a }

  describe Detection::CrmHygiene do
    let(:findings) { owner { described_class.call(as_of: Date.new(2026, 9, 12)) } }

    # Keyed on table and id together, because these findings span accounts and
    # opportunities and the ids collide between them.
    it "finds every planted defect" do
      found = findings.map { |f| [ f.subject_table, f.subject_id ] }.to_set
      missed = planted("crm_hygiene").reject { |g| found.include?([ g.subject_table, g.subject_id ]) }

      expect(missed.map { |g| g.expected["kind"] }).to be_empty
    end

    it "flags nothing that was not planted" do
      keys = planted("crm_hygiene").map { |g| [ g.subject_table, g.subject_id ] }.to_set

      expect(findings.reject { |f| keys.include?([ f.subject_table, f.subject_id ]) }).to be_empty
    end

    it "names the kind that was planted" do
      by_key = planted("crm_hygiene").index_by { |g| [ g.subject_table, g.subject_id ] }

      findings.each do |finding|
        expect(finding.kind).to eq(by_key[[ finding.subject_table, finding.subject_id ]].expected["kind"])
      end
    end

    it "covers all four kinds" do
      expect(findings.map(&:kind).uniq).to match_array(
        %w[amount_contradicts_contract close_date_in_past duplicate_account owner_departed]
      )
    end

    it "can be narrowed to one company" do
      owner do
        company = Company.find_by!(slug: "vaultline")
        scoped = described_class.call(company_id: company.id, as_of: Date.new(2026, 9, 12))

        expect(scoped.map { |f| f.company.id }.uniq).to eq([ company.id ])
      end
    end
  end

  describe Detection::OnboardingStalls do
    let(:findings) { owner { described_class.call(as_of: Date.new(2026, 9, 12)) } }

    it "finds every planted stall" do
      found = findings.map { |f| f.onboarding.id }.to_set
      missed = planted("onboarding_stall").reject { |g| found.include?(g.subject_id) }

      expect(missed).to be_empty
    end

    it "flags nothing that was not planted" do
      ids = planted("onboarding_stall").map(&:subject_id).to_set

      expect(findings.reject { |f| ids.include?(f.onboarding.id) }).to be_empty
    end

    # "Stalled" is a status. "Stalled at identity integration for 62 days" is
    # something someone can act on this afternoon.
    it "names the step it is stuck at" do
      by_id = planted("onboarding_stall").index_by(&:subject_id)

      findings.each do |finding|
        expect(finding.blocking_step.name).to eq(by_id[finding.onboarding.id].expected["blocking_step"])
      end
    end

    it "derives the wait from the steps rather than from an annotation" do
      owner do
        # blocked_since is a convenience column the generator writes. The
        # detector must not depend on it, because real records are not annotated.
        #
        # Comments are stripped before checking, since the first version of this
        # failed on the comment explaining why the column is not used.
        code = File.readlines(Rails.root.join("app/lib/detection/onboarding_stalls.rb"))
                   .reject { |line| line.strip.start_with?("#") }.join
        expect(code).not_to match(/blocked_since/)

        expect(findings).to all(have_attributes(days_blocked: be >= described_class::STALLED_AFTER_DAYS))
      end
    end

    it "leaves onboardings that are progressing alone" do
      owner do
        moving = Onboarding.where(completed_on: nil).count - findings.size
        expect(moving).to be_positive, "every unfinished onboarding was flagged, so the baseline is not moving"
      end
    end
  end
end
