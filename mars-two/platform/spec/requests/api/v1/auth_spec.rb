require "rails_helper"

# The token decides which companies the request may see, and that decision is
# pushed down to Postgres before any query runs. Everything below it is
# ordinary code that cannot reach another tenant even if it tries.
RSpec.describe "API authentication", type: :request do
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

  it "refuses a request with no token" do
    get "/api/v1/companies", headers: { "Accept" => "application/json" }

    expect(response).to have_http_status(:unauthorized)
    expect(json["error"]).to be_present
  end

  it "refuses a token that does not exist" do
    get "/api/v1/companies", headers: auth_headers("mars_not_a_real_token")

    expect(response).to have_http_status(:unauthorized)
  end

  it "refuses a malformed authorization header" do
    get "/api/v1/companies", headers: { "Authorization" => "Basic abc", "Accept" => "application/json" }

    expect(response).to have_http_status(:unauthorized)
  end

  it "accepts a valid token" do
    get "/api/v1/companies", headers: auth_headers(issue_token(role: :group_operator, companies: [ vaultline, meterpath ]))

    expect(response).to have_http_status(:ok)
  end

  it "records when a token was last used" do
    token = issue_token(role: :portco_exec, companies: [ vaultline ])
    get "/api/v1/companies", headers: auth_headers(token)

    last_used = ApplicationRecord.as_owner { ApiToken.find_by(token_digest: ApiToken.digest(token)).last_used_at }
    expect(last_used).to be_present
  end

  it "never stores the token in plaintext" do
    token = issue_token(role: :portco_exec, companies: [ vaultline ])

    ApplicationRecord.as_owner do
      expect(ApiToken.where(token_digest: token)).not_to exist
      expect(ApiToken.find_by(token_digest: ApiToken.digest(token))).to be_present
    end
  end

  # Connections are pooled. A request that left its grant on the connection would
  # hand the next request whoever's scope ran before it, which is a cross-tenant
  # read with no attacker involved.
  it "leaves no grant behind on the connection" do
    get "/api/v1/companies", headers: auth_headers(issue_token(role: :group_operator, companies: [ vaultline, meterpath ]))

    expect(response).to have_http_status(:ok)
    expect(Mars::Tenancy.current_company_ids).to be_empty
  end

  it "leaves no grant behind when the request fails" do
    get "/api/v1/companies/nope", headers: auth_headers(issue_token(role: :portco_exec, companies: [ vaultline ]))

    expect(response).to have_http_status(:not_found)
    expect(Mars::Tenancy.current_company_ids).to be_empty
  end
end
