require "rails_helper"
require Rails.root.join("lib/synthetic/generator")

RSpec.describe "Detections API", :seeded, type: :request do
  before(:context) { Synthetic::Generator.new(usage_days: 70).run! }

  let(:companies) { ApplicationRecord.as_owner { Company.order(:slug).to_a } }
  let(:vaultline) { ApplicationRecord.as_owner { Company.find_by!(slug: "vaultline") } }
  let(:operator) { auth_headers(issue_token(role: :group_operator, companies: companies)) }
  let(:as_of) { Evals::DetectorScores::AS_OF.to_s }

  describe "CRM hygiene" do
    it "returns findings with the contradiction behind each one" do
      get "/api/v1/detections/crm_hygiene", params: { as_of: as_of }, headers: operator

      expect(response).to have_http_status(:ok)
      expect(json["findings"].first).to include("kind", "reference", "company", "detail")
      expect(json["by_kind"].values.sum).to eq(json["total_findings"])
    end

    it "shows a portfolio company only its own records" do
      get "/api/v1/detections/crm_hygiene", params: { as_of: as_of },
          headers: auth_headers(issue_token(role: :portco_exec, companies: [ vaultline ]))

      expect(json["findings"].map { |f| f["company"] }.uniq).to eq([ "vaultline" ])
    end
  end

  describe "onboarding stalls" do
    it "names the blocking step rather than only the status" do
      get "/api/v1/detections/onboarding_stalls", params: { as_of: as_of }, headers: operator

      finding = json["findings"].first
      expect(finding).to include("blocking_step", "days_blocked", "customer_ref")
      expect(finding["blocking_step"]).to be_present
    end

    it "states the threshold that defines a stall" do
      get "/api/v1/detections/onboarding_stalls", params: { as_of: as_of }, headers: operator

      # Without it, "34 stalled onboardings" is a number with no definition, and
      # an agent quoting it is quoting something it cannot explain.
      expect(json["stalled_after_days"]).to eq(Detection::OnboardingStalls::STALLED_AFTER_DAYS)
    end
  end

  describe "churn risk" do
    it "returns a ranking with its components, not a flag" do
      get "/api/v1/detections/churn_risk", params: { as_of: as_of, limit: 5 }, headers: operator

      expect(json["accounts"].size).to eq(5)
      expect(json["accounts"].map { |a| a["rank"] }).to eq([ 1, 2, 3, 4, 5 ])
      expect(json["accounts"].first["signals"]).to include("usage_decline", "sentiment", "overdue")
      expect(json["accounts"].first["score"]).to be >= json["accounts"].last["score"]
      expect(json["weights"]).to be_present
    end
  end

  # The gate against defect 24 arriving through the API instead of the detector.
  it "is stable when the caller states as_of, whatever day it is" do
    get "/api/v1/detections/crm_hygiene", params: { as_of: as_of }, headers: operator
    today = json["total_findings"]

    travel_to(Date.parse(as_of) + 400) do
      get "/api/v1/detections/crm_hygiene", params: { as_of: as_of }, headers: operator
      expect(json["total_findings"]).to eq(today)
    end
  end

  it "refuses an as_of that is not a date rather than silently using today" do
    get "/api/v1/detections/crm_hygiene", params: { as_of: "last tuesday" }, headers: operator

    expect(response).to have_http_status(:unprocessable_content)
    expect(json["error"]).to include("as_of")
  end

  it "requires a token" do
    get "/api/v1/detections/churn_risk", headers: { "Accept" => "application/json" }

    expect(response).to have_http_status(:unauthorized)
  end
end
