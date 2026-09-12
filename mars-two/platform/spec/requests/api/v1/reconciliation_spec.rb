require "rails_helper"
require Rails.root.join("lib/synthetic/generator")

RSpec.describe "Reconciliation API", :seeded, type: :request do
  before(:context) { Synthetic::Generator.new(usage_days: 14).run! }

  let(:companies) { ApplicationRecord.as_owner { Company.order(:slug).to_a } }
  let(:vaultline) { ApplicationRecord.as_owner { Company.find_by!(slug: "vaultline") } }

  it "returns findings with the evidence behind each one" do
    get "/api/v1/reconciliation/contract_billing",
        headers: auth_headers(issue_token(role: :group_operator, companies: companies))

    expect(response).to have_http_status(:ok)
    finding = json["findings"].first
    expect(finding).to include("contract_reference", "kinds", "shortfall_cents", "detail")
    expect(finding["detail"].first).to include("invoice_number", "expected_cents", "billed_cents")
  end

  it "states the currency of the total rather than leaving it to be inferred" do
    get "/api/v1/reconciliation/contract_billing",
        headers: auth_headers(issue_token(role: :group_operator, companies: companies))

    expect(json["currency"]).to eq("EUR")
    expect(json["total_shortfall_cents"]).to be_positive
  end

  it "shows a portfolio company only its own leaks" do
    get "/api/v1/reconciliation/contract_billing",
        headers: auth_headers(issue_token(role: :portco_exec, companies: [ vaultline ]))

    expect(json["findings"].map { |f| f["company"] }.uniq).to eq([ "vaultline" ])
  end

  it "refuses a company outside the caller's grant" do
    get "/api/v1/reconciliation/contract_billing", params: { company: "meterpath" },
        headers: auth_headers(issue_token(role: :portco_exec, companies: [ vaultline ]))

    expect(response).to have_http_status(:not_found)
  end
end
