require "rails_helper"

# A tenant-scoped table without a row-level security policy is readable across
# tenants, silently. This is the single most likely way the isolation design in
# ADR 0002 gets broken: someone adds a table and forgets the policy.
#
# So the schema is asserted against itself. Any table carrying company_id is
# tenant-scoped by definition, and must be policied. Adding one without a policy
# fails CI rather than shipping a leak.
RSpec.describe "Row-level security coverage", type: :model do
  def connection = ApplicationRecord.connection

  # Tables that hold no tenant data and are therefore legitimately unpolicied.
  EXEMPT = %w[
    schema_migrations
    ar_internal_metadata
    users
    api_tokens
    grants
  ].freeze

  # Every table is tenant-scoped unless explicitly exempted. Inferring it from
  # the presence of a company_id column was the first version of this spec and
  # it was too weak: agent_runs carries tenant data in its trace column and
  # scopes itself by an array of company ids, so the inference missed it. A
  # deny-by-default list catches the next table shaped like that one.
  def tenant_scoped_tables
    ApplicationRecord.as_owner do
      ApplicationRecord.connection.tables.reject { |t| EXEMPT.include?(t) }
    end
  end

  it "finds tenant-scoped tables to check" do
    expect(tenant_scoped_tables).not_to be_empty
  end

  it "enables row-level security on every tenant-scoped table" do
    without_rls = ApplicationRecord.as_owner do
      tenant_scoped_tables.reject do |table|
        ApplicationRecord.connection.select_value(
          "SELECT relrowsecurity FROM pg_class WHERE relname = #{ActiveRecord::Base.connection.quote(table)}"
        )
      end
    end

    expect(without_rls).to be_empty,
      "these tables carry company_id but have no row-level security: #{without_rls.join(', ')}"
  end

  it "forces row-level security so the table owner is filtered too" do
    unforced = ApplicationRecord.as_owner do
      tenant_scoped_tables.reject do |table|
        ApplicationRecord.connection.select_value(
          "SELECT relforcerowsecurity FROM pg_class WHERE relname = #{ActiveRecord::Base.connection.quote(table)}"
        )
      end
    end

    expect(unforced).to be_empty,
      "these tables do not FORCE row-level security: #{unforced.join(', ')}"
  end

  it "runs the application as a role that cannot bypass policies" do
    row = ApplicationRecord.connection.select_one(
      "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user"
    )

    expect(row["rolsuper"]).to be(false), "the application role is a superuser, so every policy is ignored"
    expect(row["rolbypassrls"]).to be(false), "the application role has BYPASSRLS, so every policy is ignored"
  end

  it "keeps the owner bypass out of application code" do
    offenders = Dir.glob(Rails.root.join("app/**/*.rb")).select do |path|
      next false if path.end_with?("application_record.rb")

      File.read(path).include?("as_owner")
    end

    expect(offenders).to be_empty,
      "as_owner bypasses tenant isolation and should not appear in app code: #{offenders.join(', ')}"
  end
end
