require "rails_helper"
require Rails.root.join("lib/synthetic/generator")

RSpec.describe "Evals API", :seeded, type: :request do
  before(:context) { Synthetic::Generator.new(usage_days: 14).run! }

  let(:companies) { ApplicationRecord.as_owner { Company.order(:slug).to_a } }
  let(:vaultline) { ApplicationRecord.as_owner { Company.find_by!(slug: "vaultline") } }

  it "returns the recorded ledger with a verdict on every case" do
    get "/api/v1/evals/cases",
        headers: auth_headers(issue_token(role: :group_operator, companies: companies))

    expect(response).to have_http_status(:ok)
    expect(json["cases"]).to all(include("detector", "company", "subject", "verdict"))
    expect(json["verdicts"].values.sum).to eq(json["cases"].size)
  end

  # The ledger is a file rather than a query, so nothing filters it on the way
  # out of Postgres. This is the check that the controller does it instead.
  it "shows a portfolio company only its own cases" do
    get "/api/v1/evals/cases",
        headers: auth_headers(issue_token(role: :portco_exec, companies: [ vaultline ]))

    expect(json["cases"]).not_to be_empty
    expect(json["cases"].map { |c| c["company"] }.uniq).to eq([ "vaultline" ])
  end

  it "returns nothing to a caller with no grant" do
    get "/api/v1/evals/cases",
        headers: auth_headers(issue_token(role: :portco_exec, companies: []))

    expect(json["cases"]).to be_empty
  end

  it "filters to one detector" do
    get "/api/v1/evals/cases", params: { detector: "revenue_leakage" },
        headers: auth_headers(issue_token(role: :group_operator, companies: companies))

    expect(json["cases"].map { |c| c["detector"] }.uniq).to eq([ "revenue_leakage" ])
  end

  # An empty list and an unrecorded ledger look identical on screen and need
  # different actions, so they are different responses.
  it "says so when no ledger has been recorded" do
    stub_const("Api::V1::EvalsController::LEDGER_PATH", "db/eval_baselines/nothing_here.json")

    get "/api/v1/evals/cases",
        headers: auth_headers(issue_token(role: :group_operator, companies: companies))

    expect(response).to have_http_status(:not_found)
  end

  it "requires a token" do
    get "/api/v1/evals/cases", headers: { "Accept" => "application/json" }

    expect(response).to have_http_status(:unauthorized)
  end
end
