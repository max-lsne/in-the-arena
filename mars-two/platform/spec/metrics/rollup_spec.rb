require "rails_helper"
require Rails.root.join("lib/synthetic/generator")

# Every figure an agent is allowed to state comes from metric_values, computed
# here in SQL. The rule this enforces is that models never do arithmetic: an
# agent selects a precomputed value, it does not add up rows.
#
# So these specs check two things. That the numbers are right, by recomputing
# them independently. And that each value carries the formula and input count
# that let an artefact show its working and let a grader check a stated figure
# against its source rather than against a model's recollection of it.
RSpec.describe Metrics::Rollup, :seeded do
  before(:context) { Synthetic::Generator.new(usage_days: 14).run! }

  def owner(&) = ApplicationRecord.as_owner(&)

  # Always assert against a named period.
  #
  # find_by! picks whichever row the planner returns first, and because :seeded
  # skips the per-example truncation, rows written by an earlier example are
  # still there. Three of these specs passed on ordering luck until one did not.
  def latest(key)
    MetricValue.for_key(key).where(company_id: company.id).chronological.last
  end

  let(:company) { owner { Company.find_by!(slug: "vaultline") } }
  let(:period) { Date.new(2026, 8, 1) }

  describe "computing a company's monthly metrics" do
    before { owner { described_class.call(company: company, months: 3) } }

    it "writes only metrics it knows how to compute" do
      owner do
        keys = MetricValue.where(company_id: company.id).distinct.pluck(:metric_key)
        expect(keys).to all(be_in(described_class::METRICS.keys.map(&:to_s)))
        expect(keys).not_to be_empty
      end
    end

    it "writes every metric that has inputs to compute from" do
      owner do
        keys = MetricValue.where(company_id: company.id).distinct.pluck(:metric_key)
        always_computable = described_class::METRICS.select { |_, m| m.zero_when_empty }.keys.map(&:to_s)
        expect(keys).to include(*always_computable)
      end
    end

    # A metric with no inputs is unknown, not zero. Writing 0 for a median over
    # an empty set hands an agent a figure reading "time to value is zero days",
    # which is worse than having no figure, because it is confidently wrong and
    # an agent has no way to tell.
    it "omits a metric that cannot be known rather than writing zero" do
      owner do
        empty_period = Date.new(2019, 1, 1)
        described_class.call(company: company, months: 1, as_of: empty_period)

        written = MetricValue.where(company_id: company.id, period_start: empty_period.beginning_of_month)
        expect(written.pluck(:metric_key)).not_to include("median_onboarding_days", "net_revenue_retention")
        expect(written.where("input_count = 0").pluck(:metric_key))
          .to all(satisfy { |k| described_class::METRICS[k.to_sym].zero_when_empty })
      end
    end

    it "removes a stale figure once its metric becomes unknowable" do
      owner do
        stale_period = Date.new(2019, 1, 1).beginning_of_month
        MetricValue.create!(
          company: company, metric_key: "median_onboarding_days", grain: "month",
          period_start: stale_period, period_end: stale_period.end_of_month,
          value: 42, unit: "days", formula: "stale", input_count: 0, computed_at: Time.current
        )

        described_class.call(company: company, months: 1, as_of: stale_period)

        expect(MetricValue.where(company_id: company.id, period_start: stale_period,
                                 metric_key: "median_onboarding_days")).not_to exist
      end
    end

    it "records the formula that produced each value" do
      owner do
        expect(MetricValue.where(company_id: company.id).where(formula: [ nil, "" ])).not_to exist
      end
    end

    it "records how many rows went into each value" do
      owner do
        expect(MetricValue.where(company_id: company.id).where("input_count < 0")).not_to exist
      end
    end

    it "tags every value with a unit a caller can interpret" do
      owner do
        units = MetricValue.where(company_id: company.id).distinct.pluck(:unit)
        expect(units).to all(be_in(MetricValue::UNITS))
      end
    end

    it "is idempotent, so a rerun corrects rather than duplicates" do
      owner do
        before_count = MetricValue.where(company_id: company.id).count
        described_class.call(company: company, months: 3)
        expect(MetricValue.where(company_id: company.id).count).to eq(before_count)
      end
    end
  end

  describe "arr_cents" do
    before { owner { described_class.call(company: company, months: 1) } }

    it "annualises active subscriptions, matching an independent recount" do
      owner do
        value = latest("arr_cents")
        expected = Subscription.where(company_id: company.id, status: "active").sum(:mrr_cents) * 12

        expect(value.value.to_i).to eq(expected)
      end
    end

    it "lands within twelve cents of the company's headline figure" do
      owner do
        value = latest("arr_cents")
        expect((value.value.to_i - company.arr_cents).abs).to be <= 12
      end
    end

    it "counts the subscriptions behind the figure" do
      owner do
        value = latest("arr_cents")
        expect(value.input_count).to eq(Subscription.where(company_id: company.id, status: "active").count)
      end
    end
  end

  describe "open_tickets" do
    before { owner { described_class.call(company: company, months: 1) } }

    it "counts tickets open at the end of the period, not tickets opened in it" do
      owner do
        value = latest("open_tickets")
        period_end = value.period_end
        expected = SupportTicket.where(company_id: company.id)
                                .where(opened_at: ..period_end.end_of_day)
                                .where("closed_at IS NULL OR closed_at > ?", period_end.end_of_day)
                                .count

        expect(value.value.to_i).to eq(expected)
      end
    end
  end

  describe "overdue_invoice_cents" do
    before { owner { described_class.call(company: company, months: 1) } }

    it "sums what is actually overdue" do
      owner do
        value = latest("overdue_invoice_cents")
        expected = Invoice.where(company_id: company.id, status: "overdue").sum(:amount_cents)

        expect(value.value.to_i).to eq(expected)
      end
    end
  end

  describe "tenancy" do
    it "is readable by a grant over the company" do
      owner { described_class.call(company: company, months: 1) }

      Mars::Tenancy.with([ company.id ]) do
        expect(MetricValue.count).to be_positive
      end
    end

    it "is invisible to a grant over another company" do
      other = owner { Company.find_by!(slug: "meterpath") }
      owner { described_class.call(company: company, months: 1) }

      Mars::Tenancy.with([ other.id ]) do
        expect(MetricValue.where(company_id: company.id)).to be_empty
      end
    end
  end
end
