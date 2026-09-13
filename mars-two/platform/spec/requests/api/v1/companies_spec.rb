require "rails_helper"

RSpec.describe "Companies API", type: :request do
  let!(:companies) do
    ApplicationRecord.as_owner do
      [
        Company.create!(slug: "vaultline", name: "Vaultline", country: "FR", vertical: "access_security", arr_cents: 12_000_000_00, currency: "EUR"),
        Company.create!(slug: "meterpath", name: "Meterpath", country: "LV", vertical: "marketplace_billing", arr_cents: 14_500_000_00, currency: "EUR"),
        Company.create!(slug: "northquay", name: "Northquay", country: "IT", vertical: "strategic_portfolio_management", arr_cents: 8_200_000_00, currency: "EUR")
      ]
    end
  end
  let(:vaultline) { companies.first }
  let(:meterpath) { companies.second }

  describe "as a group operator" do
    let(:token) { issue_token(role: :group_operator, companies: companies) }

    it "lists every company in the group" do
      get "/api/v1/companies", headers: auth_headers(token)

      expect(json["companies"].map { |c| c["slug"] }).to match_array(%w[vaultline meterpath northquay])
    end

    it "states each company's own definition of recurring revenue" do
      get "/api/v1/companies", headers: auth_headers(token)

      expect(json["companies"].first).to include("arr_definition")
    end
  end

  describe "as a portfolio company executive" do
    let(:token) { issue_token(role: :portco_exec, companies: [ vaultline ]) }

    it "lists only their own company" do
      get "/api/v1/companies", headers: auth_headers(token)

      expect(json["companies"].map { |c| c["slug"] }).to eq([ "vaultline" ])
    end

    it "cannot read another company by slug" do
      get "/api/v1/companies/meterpath", headers: auth_headers(token)

      expect(response).to have_http_status(:not_found)
    end

    it "can read their own company by slug" do
      get "/api/v1/companies/vaultline", headers: auth_headers(token)

      expect(response).to have_http_status(:ok)
      expect(json["company"]["slug"]).to eq("vaultline")
    end
  end

  describe "as a forward deployed engineer with a partial grant" do
    let(:token) { issue_token(role: :fde, companies: [ vaultline, meterpath ]) }

    it "lists only the assigned subset" do
      get "/api/v1/companies", headers: auth_headers(token)

      expect(json["companies"].map { |c| c["slug"] }).to match_array(%w[vaultline meterpath])
    end

    it "cannot read a company outside the subset" do
      get "/api/v1/companies/northquay", headers: auth_headers(token)

      expect(response).to have_http_status(:not_found)
    end
  end
end
