require "rails_helper"
require Rails.root.join("lib/synthetic/generator")

# The generator is eval infrastructure, not a seeding convenience. If it is not
# deterministic, eval baselines cannot be compared across runs. If a planted
# defect is not actually observable in the data, the grader marks an agent wrong
# for missing something that was never there. Both are asserted here.
#
# usage_days is reduced so the suite stays quick. Determinism does not depend on
# the volume, only on the seed.
RSpec.describe Synthetic::Generator, :seeded do
  FAST = { usage_days: 14 }.freeze

  def seed!(seed: described_class::DEFAULT_SEED)
    described_class.new(seed: seed, **FAST).run!
  end

  def owner(&) = ApplicationRecord.as_owner(&)

  describe "the portfolio" do
    before(:context) { described_class.new(usage_days: 14).run! }

    it "creates eight companies" do
      owner { expect(Company.count).to eq(8) }
    end

    it "totals exactly EUR 70.0M of headline ARR" do
      owner { expect(Company.sum(:arr_cents)).to eq(70_000_000_00) }
    end

    it "gives the companies different definitions of recurring revenue" do
      owner { expect(Company.distinct.pluck(:arr_definition).size).to be > 1 }
    end

    it "annualises subscriptions to within twelve cents of each headline figure" do
      owner do
        Company.find_each do |company|
          annualised = Subscription.where(company_id: company.id).sum(:mrr_cents) * 12
          expect((annualised - company.arr_cents).abs).to be <= 12,
            "#{company.slug} drifted by #{(annualised - company.arr_cents).abs} cents"
        end
      end
    end
  end

  describe "determinism" do
    # A checksum over the fields an agent can actually see. If this moves, every
    # recorded eval baseline is invalid, which is why ADR 0004 stamps the seed
    # and generator version into each eval run.
    def fingerprint
      owner do
        parts = []
        parts << Company.order(:slug).pluck(:slug, :arr_cents, :arr_definition)
        parts << Customer.order(:company_id, :external_ref).limit(200).pluck(:external_ref, :name, :country, :churned_on)
        parts << Contract.order(:company_id, :reference).limit(200).pluck(:reference, :contracted_value_cents, :terms)
        parts << GroundTruth.order(:company_id, :defect_class, :subject_id).pluck(:defect_class, :subject_table, :expected)
        Digest::SHA256.hexdigest(parts.to_json)
      end
    end

    it "produces identical data from the same seed" do
      seed!
      first = fingerprint
      seed!
      expect(fingerprint).to eq(first)
    end

    it "produces different data from a different seed" do
      seed!
      first = fingerprint
      seed!(seed: described_class::DEFAULT_SEED + 1)
      expect(fingerprint).not_to eq(first)
    end
  end

  describe "the planted answer key" do
    before(:context) { described_class.new(usage_days: 14).run! }

    it "plants all four defect classes in every company" do
      owner do
        by_company = GroundTruth.group(:company_id, :defect_class).count
        Company.find_each do |company|
          %w[revenue_leakage crm_hygiene churn_risk onboarding_stall].each do |klass|
            expect(by_company[[ company.id, klass ]].to_i).to be > 0,
              "#{company.slug} has no #{klass} defect planted"
          end
        end
      end
    end

    it "points every ground truth at a row that exists" do
      owner do
        GroundTruth.find_each do |gt|
          model = gt.subject_table.classify.constantize
          expect(model.where(id: gt.subject_id)).to exist,
            "#{gt.defect_class} points at missing #{gt.subject_table}##{gt.subject_id}"
        end
      end
    end

    it "records an exact expected shortfall on every revenue leak" do
      owner do
        GroundTruth.where(defect_class: "revenue_leakage").find_each do |gt|
          expect(gt.expected["shortfall_cents"]).to be_a(Integer)
          expect(gt.expected["shortfall_cents"]).to be_positive
        end
      end
    end
  end

  describe "the corpus makes every planted leak citable" do
    before(:context) { described_class.new(usage_days: 14).run! }

    # A finding without a citation is an assertion. If the clause that was
    # breached is not in the corpus, the grader is asking an agent to quote a
    # document that does not exist, and the agent is right to refuse.
    it "writes a contract document for every contract carrying a planted leak" do
      owner do
        GroundTruth.where(defect_class: "revenue_leakage").find_each do |gt|
          contract = Contract.find(gt.subject_id)
          expect(Document.where(company_id: gt.company_id, source_ref: contract.reference)).to exist,
            "no document for #{contract.reference}, so its leak cannot be cited"
        end
      end
    end

    it "puts the breached clause in the document text" do
      owner do
        GroundTruth.where(defect_class: "revenue_leakage").find_each do |gt|
          contract = Contract.find(gt.subject_id)
          body = Document.find_by(company_id: gt.company_id, source_ref: contract.reference).body

          expected = case gt.expected["kind"]
          when "uplift_not_applied" then "#{gt.expected['uplift_pct']}% on each anniversary"
          when "expired_discount_still_applied" then "discount of #{gt.expected['discount_pct']}%"
          when "seat_growth_unbilled" then "Committed User Count is #{gt.expected['seats_before']}"
          when "currency_mismatch" then "payable in #{gt.expected['contract_currency']}"
          end

          expect(body).to include(expected),
            "#{contract.reference} (#{gt.expected['kind']}) has no clause saying #{expected.inspect}"
        end
      end
    end

    it "embeds every chunk with the backend that is currently configured" do
      owner do
        expect(DocumentChunk.where.not(embedding_backend: Mars::Embedding.backend_name).count).to eq(0)
        expect(DocumentChunk.where(embedding: nil).count).to eq(0)
      end
    end
  end

  describe "initiatives are measurable against real metrics" do
    before(:context) { described_class.new(usage_days: 14).run! }

    it "targets only metrics the rollup actually computes" do
      owner do
        computable = Metrics::Rollup::METRICS.keys.map(&:to_s)
        keys = Initiative.distinct.pluck(:target_metric_key).compact

        expect(keys).to all(be_in(computable)),
          "these initiatives name metrics nothing computes: #{(keys - computable).join(', ')}"
      end
    end

    it "states the unit of every baseline and target" do
      owner { expect(Initiative.where(target_unit: [ nil, "" ])).not_to exist }
    end

    # The bug: baselines were drawn from one range of 50 to 110 whatever the
    # metric was, so a retention initiative carried a baseline of 50 against a
    # measured ratio near 1.0, and progress came out at 4.65.
    it "states baselines in the unit its metric is measured in" do
      owner do
        units = Metrics::Rollup::METRICS.transform_keys(&:to_s).transform_values(&:unit)

        Initiative.find_each do |initiative|
          expect(initiative.target_unit).to eq(units[initiative.target_metric_key]),
            "#{initiative.title} targets #{initiative.target_metric_key} " \
            "(#{units[initiative.target_metric_key]}) with a #{initiative.target_unit} baseline"
        end
      end
    end

    it "keeps ratio baselines in a plausible range for a ratio" do
      owner do
        Initiative.where(target_unit: "ratio").find_each do |initiative|
          expect(initiative.baseline_value.to_f).to be_between(0, 10),
            "#{initiative.title} has a ratio baseline of #{initiative.baseline_value}"
        end
      end
    end
  end

  describe "planted defects are observable in the data" do
    before(:context) { described_class.new(usage_days: 14).run! }

    def truths(kind)
      owner { GroundTruth.where(defect_class: kind).to_a.select { |g| yield(g) } }
    end

    it "leaves uplift unapplied on the contracts that record it" do
      owner do
        gts = GroundTruth.where(defect_class: "revenue_leakage").select { |g| g.expected["kind"] == "uplift_not_applied" }
        expect(gts).not_to be_empty

        gts.each do |gt|
          contract = Contract.find(gt.subject_id)
          after = Invoice.where(contract_id: contract.id)
                         .where(period_start: (contract.starts_on + 365)..)
                         .pluck(:amount_cents).uniq
          expect(after.size).to eq(1),
            "#{contract.reference} should bill a flat amount after its anniversary, saw #{after.size} values"
          expect(contract.terms["uplift_pct"]).to be_positive
        end
      end
    end

    it "leaves an expired discount still applied" do
      owner do
        gts = GroundTruth.where(defect_class: "revenue_leakage").select { |g| g.expected["kind"] == "expired_discount_still_applied" }
        gts.each do |gt|
          contract = Contract.find(gt.subject_id)
          expiry = Date.parse(gt.expected["expired_on"])
          expect(Invoice.where(contract_id: contract.id).where(period_start: (expiry + 1)..)).to exist
        end
      end
    end

    it "invoices in a currency the contract does not name" do
      owner do
        gts = GroundTruth.where(defect_class: "revenue_leakage").select { |g| g.expected["kind"] == "currency_mismatch" }
        gts.each do |gt|
          contract = Contract.find(gt.subject_id)
          mismatched = Invoice.where(contract_id: contract.id).where.not(currency: contract.currency).count
          expect(mismatched).to eq(gt.expected["affected_invoice_count"])
        end
      end
    end

    it "grows seats beyond what the contract committed" do
      owner do
        gts = GroundTruth.where(defect_class: "revenue_leakage").select { |g| g.expected["kind"] == "seat_growth_unbilled" }
        gts.each do |gt|
          contract = Contract.find(gt.subject_id)
          subscription = Subscription.find_by(company_id: contract.company_id, customer_id: contract.customer_id)
          expect(subscription.seats).to eq(gt.expected["seats_after"])
          expect(subscription.seats).to be > gt.expected["seats_before"]
        end
      end
    end

    it "creates a second CRM account for the same customer" do
      owner do
        gts = GroundTruth.where(defect_class: "crm_hygiene").select { |g| g.expected["kind"] == "duplicate_account" }
        expect(gts).not_to be_empty
        gts.each do |gt|
          dup = CrmAccount.find(gt.subject_id)
          expect(CrmAccount.where(company_id: dup.company_id, customer_id: dup.customer_id).count).to be >= 2
        end
      end
    end

    it "leaves accounts owned by people who have left" do
      owner do
        gts = GroundTruth.where(defect_class: "crm_hygiene").select { |g| g.expected["kind"] == "owner_departed" }
        gts.each do |gt|
          account = CrmAccount.find(gt.subject_id)
          expect(Employee.find(account.owner_employee_id).left_on).to be_present
        end
      end
    end

    it "leaves open opportunities with a close date in the past" do
      owner do
        gts = GroundTruth.where(defect_class: "crm_hygiene").select { |g| g.expected["kind"] == "close_date_in_past" }
        gts.each do |gt|
          opp = CrmOpportunity.find(gt.subject_id)
          expect(opp.close_date).to be < Date.new(2026, 9, 12)
          expect(%w[closed_won closed_lost]).not_to include(opp.stage)
        end
      end
    end

    it "makes at-risk accounts carry every signal it claims" do
      owner do
        gts = GroundTruth.where(defect_class: "churn_risk")
        expect(gts.count).to be_positive

        gts.each do |gt|
          customer = Customer.find(gt.subject_id)
          expect(customer.churned_on).to be_nil, "an at-risk account should not have churned already"
          expect(SupportTicket.where(customer_id: customer.id, closed_at: nil).where("sentiment < ?", -0.5)).to exist
          expect(Invoice.where(customer_id: customer.id, status: "overdue")).to exist
        end
      end
    end

    it "stalls onboardings at the step it names" do
      owner do
        gts = GroundTruth.where(defect_class: "onboarding_stall")
        expect(gts.count).to be_positive

        gts.each do |gt|
          onboarding = Onboarding.find(gt.subject_id)
          expect(onboarding.blocked_since).to be_present
          expect(onboarding.completed_on).to be_nil

          blocker = OnboardingStep.where(onboarding_id: onboarding.id).order(:position).find { |s| s.completed_on.nil? }
          expect(blocker.name).to eq(gt.expected["blocking_step"])
          expect(blocker.position).to eq(gt.expected["blocking_step_position"])
        end
      end
    end
  end
end
