require "rails_helper"

# The value creation plan. An initiative that claims to move a metric is only
# useful if the claim is checkable, so the response carries the metric's current
# value from metric_values rather than asserting progress on its own authority.
RSpec.describe "Initiatives API", type: :request do
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

  let!(:owner_employee) do
    ApplicationRecord.as_owner { Employee.create!(company: vaultline, name: "Amelie Rossi", job_role: "Sales Director") }
  end

  before do
    ApplicationRecord.as_owner do
      Initiative.create!(
        company: vaultline, owner_employee: owner_employee,
        title: "Lift net revenue retention above 105%", thesis: "Agreed at the 2025 value creation review.",
        status: "in_progress", target_metric_key: "net_revenue_retention",
        baseline_value: 0.98, target_value: 1.05, due_on: Date.new(2026, 12, 31)
      )
      Initiative.create!(
        company: meterpath, title: "Cut time to first value", status: "at_risk",
        target_metric_key: "median_onboarding_days", baseline_value: 60, target_value: 30,
        due_on: Date.new(2026, 11, 30)
      )
      MetricValue.create!(
        company: vaultline, metric_key: "net_revenue_retention", grain: "month",
        period_start: Date.new(2026, 9, 1), period_end: Date.new(2026, 9, 30),
        value: 1.027, unit: "ratio", formula: "billed this month / billed twelve months ago",
        input_count: 91, computed_at: Time.current
      )
    end
  end

  let(:token) { issue_token(role: :portco_exec, companies: [ vaultline ]) }

  it "lists the caller's initiatives" do
    get "/api/v1/initiatives", headers: auth_headers(token)

    expect(response).to have_http_status(:ok)
    expect(json["initiatives"].map { |i| i["title"] }).to eq([ "Lift net revenue retention above 105%" ])
  end

  it "does not list another company's initiatives" do
    get "/api/v1/initiatives", headers: auth_headers(token)

    expect(json["initiatives"].map { |i| i["company"] }.uniq).to eq([ "vaultline" ])
  end

  it "names the owner" do
    get "/api/v1/initiatives", headers: auth_headers(token)

    expect(json["initiatives"].first["owner"]).to eq("Amelie Rossi")
  end

  it "attaches the current value of the metric the initiative claims to move" do
    get "/api/v1/initiatives", headers: auth_headers(token)

    target = json["initiatives"].first["target"]
    expect(target["metric_key"]).to eq("net_revenue_retention")
    expect(target["current_value"]).to eq("1.027")
    expect(target["unit"]).to eq("ratio")
  end

  it "reports progress against the baseline" do
    get "/api/v1/initiatives", headers: auth_headers(token)

    # (1.027 - 0.98) / (1.05 - 0.98) = 0.671
    expect(json["initiatives"].first["target"]["progress"]).to be_within(0.001).of(0.671)
  end

  # An initiative pointed at a metric nothing computes has no progress, and
  # saying so is better than reporting zero, which reads as "no movement".
  it "reports no progress when the metric has no computed value" do
    other_token = issue_token(role: :group_operator, companies: [ vaultline, meterpath ])
    get "/api/v1/initiatives", params: { company: "meterpath" }, headers: auth_headers(other_token)

    target = json["initiatives"].first["target"]
    expect(target["current_value"]).to be_nil
    expect(target["progress"]).to be_nil
  end

  it "filters by status" do
    get "/api/v1/initiatives", params: { status: "done" }, headers: auth_headers(token)

    expect(json["initiatives"]).to be_empty
  end
end
