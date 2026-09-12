require "rails_helper"

# The endpoint an agent reads figures from. Every value arrives labelled with its
# unit, the formula that produced it and the number of rows behind it, so an
# artefact can show its working and a grader can check a stated figure against
# its source. A bare number would leave a model to guess whether 12000000000 is
# euros, cents or a ratio.
RSpec.describe "Metrics API", type: :request do
  let!(:vaultline) do
    ApplicationRecord.as_owner do
      Company.create!(slug: "vaultline", name: "Vaultline", country: "FR",
                      vertical: "access_security", arr_cents: 12_000_000_00, currency: "EUR")
    end
  end
  let!(:meterpath) do
    ApplicationRecord.as_owner do
      Company.create!(slug: "meterpath", name: "Meterpath", country: "LV",
                      vertical: "marketplace_billing", arr_cents: 14_500_000_00, currency: "EUR")
    end
  end

  before do
    ApplicationRecord.as_owner do
      [ vaultline, meterpath ].each do |company|
        MetricValue.create!(
          company: company, metric_key: "arr_cents", grain: "month",
          period_start: Date.new(2026, 9, 1), period_end: Date.new(2026, 9, 30),
          value: company.arr_cents, unit: "eur_cents",
          formula: "sum(subscriptions.mrr_cents active at period_end) * 12",
          input_count: 103, computed_at: Time.current
        )
      end
    end
  end

  describe "as a portfolio company executive" do
    let(:token) { issue_token(role: :portco_exec, companies: [ vaultline ]) }

    it "returns their own company's metrics" do
      get "/api/v1/metrics", params: { company: "vaultline" }, headers: auth_headers(token)

      expect(response).to have_http_status(:ok)
      expect(json["metrics"].map { |m| m["metric_key"] }).to include("arr_cents")
    end

    it "labels every value with its unit" do
      get "/api/v1/metrics", params: { company: "vaultline" }, headers: auth_headers(token)

      expect(json["metrics"]).to all(include("unit"))
    end

    it "shows the formula behind every value" do
      get "/api/v1/metrics", params: { company: "vaultline" }, headers: auth_headers(token)

      expect(json["metrics"]).to all(include("formula"))
      expect(json["metrics"].map { |m| m["formula"] }).to all(be_present)
    end

    it "shows how many rows each value was computed from" do
      get "/api/v1/metrics", params: { company: "vaultline" }, headers: auth_headers(token)

      expect(json["metrics"]).to all(include("input_count"))
    end

    it "returns nothing for another company, rather than refusing" do
      get "/api/v1/metrics", params: { company: "meterpath" }, headers: auth_headers(token)

      expect(response).to have_http_status(:not_found)
    end

    it "filters to the requested keys" do
      get "/api/v1/metrics", params: { company: "vaultline", keys: "arr_cents" }, headers: auth_headers(token)

      expect(json["metrics"].map { |m| m["metric_key"] }.uniq).to eq([ "arr_cents" ])
    end

    it "returns an empty set for a metric that is not computed, not a zero" do
      get "/api/v1/metrics", params: { company: "vaultline", keys: "median_onboarding_days" }, headers: auth_headers(token)

      expect(response).to have_http_status(:ok)
      expect(json["metrics"]).to be_empty
    end
  end

  describe "as a group operator" do
    let(:token) { issue_token(role: :group_operator, companies: [ vaultline, meterpath ]) }

    it "returns metrics across the portfolio when no company is named" do
      get "/api/v1/metrics", headers: auth_headers(token)

      expect(json["metrics"].map { |m| m["company"] }.uniq).to match_array(%w[vaultline meterpath])
    end
  end
end
