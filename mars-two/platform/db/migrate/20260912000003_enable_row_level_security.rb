class EnableRowLevelSecurity < ActiveRecord::Migration[8.1]
  # Tables that hold no tenant data. Everything else is policied, and the
  # coverage spec asserts that this list and the schema agree.
  EXEMPT = %w[schema_migrations ar_internal_metadata users api_tokens grants].freeze

  # Policied on their own company_id.
  BY_COMPANY_ID = %w[
    employees customers subscriptions contracts invoices invoice_lines
    usage_daily support_tickets crm_accounts crm_opportunities
    onboardings onboarding_steps initiatives metric_values
    documents document_chunks artefact_claims ground_truths
  ].freeze

  def up
    # The directory itself. A grant names companies, so the company row is
    # visible exactly when it is granted.
    policy_on "companies", "id = ANY (mars_company_ids())"

    BY_COMPANY_ID.each do |table|
      policy_on table, "company_id = ANY (mars_company_ids())"
    end

    # A run is visible only to a grant covering every company it touches.
    # Containment rather than intersection: a benchmark naming eight companies
    # is unreadable by someone granted one, which is the whole point of
    # recording the scope as a set.
    policy_on "agent_runs", "scope_company_ids <@ mars_company_ids()"

    # An artefact inherits its run's visibility. The subquery is itself filtered
    # by the policy above, so an invisible run yields an invisible artefact
    # without restating the rule.
    policy_on "agent_artefacts",
              "EXISTS (SELECT 1 FROM agent_runs r WHERE r.id = agent_artefacts.agent_run_id)"

    # The answer key is policied like everything else and additionally taken away
    # from the runtime role entirely. An agent that can read planted defects
    # scores perfectly and tells you nothing. See ADR 0004.
    execute "REVOKE ALL ON ground_truths FROM mars_app;"
  end

  def down
    ([ "companies", "agent_runs", "agent_artefacts" ] + BY_COMPANY_ID).each do |table|
      execute "DROP POLICY IF EXISTS tenant_isolation ON #{table};"
      execute "ALTER TABLE #{table} NO FORCE ROW LEVEL SECURITY;"
      execute "ALTER TABLE #{table} DISABLE ROW LEVEL SECURITY;"
    end
    execute "GRANT SELECT, INSERT, UPDATE, DELETE ON ground_truths TO mars_app;"
  end

  private

  # FORCE matters as much as ENABLE. Without it the table owner is exempt from
  # its own policies, so anything connecting as the owner reads every tenant and
  # the policy looks like it works right up until it does not.
  #
  # FOR ALL means WITH CHECK defaults to the USING expression, so a write
  # carrying another tenant's company_id is rejected rather than silently
  # accepted and then invisible.
  def policy_on(table, using)
    execute "ALTER TABLE #{table} ENABLE ROW LEVEL SECURITY;"
    execute "ALTER TABLE #{table} FORCE ROW LEVEL SECURITY;"
    execute "DROP POLICY IF EXISTS tenant_isolation ON #{table};"
    execute "CREATE POLICY tenant_isolation ON #{table} FOR ALL USING (#{using});"
  end
end
