require "rails_helper"
require Rails.root.join("lib/synthetic/generator")

RSpec.describe "Benchmark API", :seeded, type: :request do
  before(:context) do
    Synthetic::Generator.new(usage_days: 70).run!
    ApplicationRecord.as_owner do
      Company.find_each { |company| Metrics::Rollup.call(company: company, months: 3) }
    end
  end

  let(:companies) { ApplicationRecord.as_owner { Company.order(:slug).to_a } }
  let(:vaultline) { ApplicationRecord.as_owner { Company.find_by!(slug: "vaultline") } }
  let(:operator) { auth_headers(issue_token(role: :group_operator, companies: companies)) }

  def benchmark(key, headers: nil)
    get "/api/v1/benchmark", params: { keys: key }, headers: headers || operator
    json["metrics"][key]
  end

  it "ranks a like-for-like metric and states the median" do
    result = benchmark("net_revenue_retention")

    expect(result["comparable"]).to be(true)
    expect(result["companies"].map { |c| c["rank"] }).to eq((1..8).to_a)
    expect(result["portfolio_median"]).to be_present
    expect(result["unit"]).to eq("ratio")
  end

  # The defect this endpoint exists to prevent. First place on a lower-is-better
  # metric is the worst in the portfolio, and an agent writing "ranks first on
  # churn" would be writing praise.
  #
  # Written against gross churn first, where every company reads 0.0 in the
  # latest month, so the ascending and descending orders were identical and the
  # test passed with the direction inverted. The uniqueness guard is what makes
  # this measurable rather than merely green.
  it "ranks by better rather than by bigger" do
    result = benchmark("median_onboarding_days")

    expect(result["higher_is_better"]).to be(false)
    values = result["companies"].sort_by { |c| c["rank"] }.map { |c| c["value"].to_f }
    expect(values.uniq.size).to be > 1
    expect(values).to eq(values.sort)
  end

  it "ranks a higher-is-better metric the other way" do
    result = benchmark("pipeline_coverage")

    expect(result["higher_is_better"]).to be(true)
    values = result["companies"].sort_by { |c| c["rank"] }.map { |c| c["value"].to_f }
    expect(values.uniq.size).to be > 1
    expect(values).to eq(values.sort.reverse)
  end

  describe "figures that must not be put in order" do
    it "refuses to rank ARR, and says why" do
      result = benchmark("arr_cents")

      expect(result["comparable"]).to be(false)
      expect(result["not_comparable_because"]).to include("definition")
      # No rank and no median: there is no number to quote as a standing.
      expect(result["companies"].map { |c| c["rank"] }.compact).to be_empty
      expect(result).not_to have_key("portfolio_median")
    end

    it "carries each company's own definition so the values can still be read" do
      result = benchmark("arr_cents")

      expect(result["companies"].map { |c| c["arr_definition"] }.uniq.sort)
        .to eq(%w[annualised_mrr booked_acv contracted_arr])
    end

    it "refuses to rank an absolute count that scales with company size" do
      result = benchmark("open_tickets")

      expect(result["comparable"]).to be(false)
      expect(result["not_comparable_because"]).to include("scales with company size")
    end
  end

  # Prose rounds, and an artefact that says "EUR 5.5M" has to be quoting a figure
  # rather than rescaling one, because a validator that allowed arbitrary
  # rescaling would let an invented number through.
  it "precomputes the rounded figure a sentence would use" do
    result = benchmark("arr_cents")

    entry = result["companies"].find { |c| c["company"] == "clausemark" }
    expect(entry["value_millions"]).to eq("5.5")
    expect(entry["value"]).to start_with("5499999")
  end

  it "omits it for a metric that is not money" do
    expect(benchmark("pipeline_coverage")["companies"].first).not_to have_key("value_millions")
  end

  it "shows a portfolio company only itself, which is a benchmark of one" do
    result = benchmark("net_revenue_retention",
                       headers: auth_headers(issue_token(role: :portco_exec, companies: [ vaultline ])))

    expect(result["companies"].map { |c| c["company"] }).to eq([ "vaultline" ])
    expect(result["companies"].first["of"]).to eq(1)
  end

  it "says a metric is unavailable rather than returning an empty table" do
    result = benchmark("no_such_metric_key")

    expect(result["available"]).to be(false)
    expect(result["reason"]).to include("no_such_metric_key")
  end

  it "refuses an as_of that is not a date" do
    get "/api/v1/benchmark", params: { keys: "arr_cents", as_of: "last tuesday" }, headers: operator

    expect(response).to have_http_status(:unprocessable_content)
  end

  it "requires a token" do
    get "/api/v1/benchmark", headers: { "Accept" => "application/json" }

    expect(response).to have_http_status(:unauthorized)
  end
end
