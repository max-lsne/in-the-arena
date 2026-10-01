class CreateCoreSchema < ActiveRecord::Migration[8.1]
  def change
    # --- identity and grants -------------------------------------------------
    # Not tenant-scoped. These tables decide who may see which tenant, so
    # scoping them by tenant would be circular.

    create_table :companies do |t|
      t.string  :slug, null: false
      t.string  :name, null: false
      t.string  :country, null: false, limit: 2
      t.string  :vertical, null: false
      t.string  :currency, null: false, default: "EUR", limit: 3
      t.bigint  :arr_cents, null: false
      t.date    :acquired_on
      t.integer :founded_year

      # The eight companies disagree about what counts as recurring revenue.
      # Recording which definition each one uses is what makes cross-portfolio
      # comparison honest rather than merely possible.
      t.string  :arr_definition, null: false, default: "contracted_arr"

      t.timestamps
      t.index :slug, unique: true
    end

    create_table :users do |t|
      t.string :email, null: false
      t.string :name, null: false
      t.string :role, null: false # group_operator | portco_exec | fde
      t.timestamps
      t.index :email, unique: true
    end

    create_table :grants do |t|
      t.references :user, null: false, foreign_key: true
      t.references :company, null: false, foreign_key: true
      t.timestamps
      t.index %i[user_id company_id], unique: true
    end

    create_table :api_tokens do |t|
      t.references :user, null: false, foreign_key: true
      t.string :name, null: false
      t.string :token_digest, null: false
      t.datetime :last_used_at
      t.timestamps
      t.index :token_digest, unique: true
    end

    # --- operating data ------------------------------------------------------

    create_table :employees do |t|
      t.references :company, null: false, foreign_key: true
      t.string :name, null: false
      t.string :email
      t.string :job_role
      t.date   :started_on
      t.date   :left_on
      t.timestamps
      t.index %i[company_id left_on]
    end

    create_table :customers do |t|
      t.references :company, null: false, foreign_key: true
      t.string :external_ref, null: false
      t.string :name, null: false
      t.string :country, limit: 2
      t.string :segment
      t.date   :first_seen_on
      t.date   :churned_on
      t.timestamps
      t.index %i[company_id external_ref], unique: true
      t.index %i[company_id churned_on]
    end

    create_table :subscriptions do |t|
      t.references :company, null: false, foreign_key: true
      t.references :customer, null: false, foreign_key: true
      t.string  :plan, null: false
      t.integer :seats
      t.bigint  :unit_price_cents
      t.string  :currency, null: false, limit: 3
      t.bigint  :mrr_cents, null: false, default: 0
      t.date    :started_on, null: false
      t.date    :ends_on
      t.string  :status, null: false, default: "active"
      t.timestamps
      t.index %i[company_id status]
    end

    create_table :contracts do |t|
      t.references :company, null: false, foreign_key: true
      t.references :customer, null: false, foreign_key: true
      t.string :reference, null: false
      t.date   :signed_on, null: false
      t.date   :starts_on, null: false
      t.date   :ends_on
      t.string :currency, null: false, limit: 3
      t.bigint :contracted_value_cents, null: false

      # Uplift percentage, seat commitment, discount and its expiry. The
      # reconciliation agent's job is to find where these were not honoured.
      t.jsonb  :terms, null: false, default: {}

      t.timestamps
      t.index %i[company_id reference], unique: true
    end

    create_table :invoices do |t|
      t.references :company, null: false, foreign_key: true
      t.references :customer, null: false, foreign_key: true
      t.references :contract, foreign_key: true
      t.string :number, null: false
      t.date   :issued_on, null: false
      t.date   :period_start, null: false
      t.date   :period_end, null: false
      t.string :currency, null: false, limit: 3
      t.bigint :amount_cents, null: false
      t.string :status, null: false, default: "paid"
      t.date   :paid_on
      t.timestamps
      t.index %i[company_id number], unique: true
      t.index %i[company_id issued_on]
    end

    create_table :invoice_lines do |t|
      t.references :company, null: false, foreign_key: true
      t.references :invoice, null: false, foreign_key: true
      t.string  :description, null: false
      t.decimal :quantity, precision: 12, scale: 2, null: false, default: 1
      t.bigint  :unit_price_cents, null: false
      t.bigint  :amount_cents, null: false
      t.timestamps
    end

    create_table :usage_daily do |t|
      t.references :company, null: false, foreign_key: true
      t.references :customer, null: false, foreign_key: true
      t.date    :on_date, null: false
      t.string  :metric_key, null: false
      t.decimal :value, precision: 16, scale: 4, null: false
      t.index %i[company_id customer_id metric_key on_date], unique: true,
              name: "idx_usage_daily_unique"
    end

    create_table :support_tickets do |t|
      t.references :company, null: false, foreign_key: true
      t.references :customer, null: false, foreign_key: true
      t.string   :external_ref, null: false
      t.datetime :opened_at, null: false
      t.datetime :closed_at
      t.string   :priority, null: false, default: "normal"
      t.string   :category
      t.string   :subject, null: false
      t.decimal  :sentiment, precision: 4, scale: 3
      t.timestamps
      t.index %i[company_id external_ref], unique: true
      t.index %i[company_id opened_at]
    end

    create_table :crm_accounts do |t|
      t.references :company, null: false, foreign_key: true
      t.references :customer, foreign_key: true
      t.references :owner_employee, foreign_key: { to_table: :employees }
      t.string :external_ref, null: false
      t.string :name, null: false
      t.string :country, limit: 2
      t.timestamps
      t.index %i[company_id external_ref], unique: true
    end

    create_table :crm_opportunities do |t|
      t.references :company, null: false, foreign_key: true
      t.references :crm_account, null: false, foreign_key: true
      t.references :owner_employee, foreign_key: { to_table: :employees }
      t.string :external_ref, null: false
      t.string :name, null: false
      t.string :stage, null: false
      t.bigint :amount_cents
      t.string :currency, limit: 3
      t.date   :close_date
      t.datetime :last_activity_at
      t.timestamps
      t.index %i[company_id external_ref], unique: true
      t.index %i[company_id stage]
    end

    create_table :onboardings do |t|
      t.references :company, null: false, foreign_key: true
      t.references :customer, null: false, foreign_key: true
      t.date :started_on, null: false
      t.date :completed_on
      t.date :blocked_since
      t.timestamps
    end

    create_table :onboarding_steps do |t|
      t.references :company, null: false, foreign_key: true
      t.references :onboarding, null: false, foreign_key: true
      t.string  :name, null: false
      t.integer :position, null: false
      t.date    :completed_on
      t.timestamps
      t.index %i[onboarding_id position], unique: true
    end

    create_table :initiatives do |t|
      t.references :company, null: false, foreign_key: true
      t.references :owner_employee, foreign_key: { to_table: :employees }
      t.string  :title, null: false
      t.text    :thesis
      t.string  :status, null: false, default: "in_progress"
      t.string  :target_metric_key
      t.decimal :baseline_value, precision: 16, scale: 4
      t.decimal :target_value, precision: 16, scale: 4
      t.date    :due_on
      t.timestamps
      t.index %i[company_id status]
    end

    # --- precomputed numbers -------------------------------------------------
    # Every figure an agent is allowed to state lives here, computed in SQL.
    # Models select from this table; they never aggregate. The formula and input
    # count travel with the value so an artefact can show its working.

    create_table :metric_values do |t|
      t.references :company, null: false, foreign_key: true
      t.string  :metric_key, null: false
      t.string  :grain, null: false # month | quarter
      t.date    :period_start, null: false
      t.date    :period_end, null: false
      t.decimal :value, precision: 18, scale: 4, null: false
      t.string  :unit, null: false # eur_cents | ratio | percent | count
      t.string  :formula, null: false
      t.integer :input_count, null: false, default: 0
      t.datetime :computed_at, null: false
      t.index %i[company_id metric_key grain period_start], unique: true,
              name: "idx_metric_values_unique"
    end

    # --- unstructured --------------------------------------------------------

    create_table :documents do |t|
      t.references :company, null: false, foreign_key: true
      t.string :kind, null: false # contract | board_minutes | support_transcript
      t.string :title, null: false
      t.string :source_ref
      t.date   :authored_on
      t.text   :body, null: false
      t.timestamps
      t.index %i[company_id kind]
    end

    create_table :document_chunks do |t|
      t.references :company, null: false, foreign_key: true
      t.references :document, null: false, foreign_key: true
      t.integer :position, null: false
      t.text    :content, null: false
      t.integer :token_count
      t.string  :section_ref
      t.column  :embedding, :vector, limit: 1024
      t.timestamps
      t.index %i[document_id position], unique: true
    end

    # --- agent output --------------------------------------------------------

    create_table :agent_runs do |t|
      t.string   :agent_key, null: false

      # The companies this run is about. A run is visible only to a grant
      # covering all of them, so a cross-portfolio benchmark naming eight
      # companies is unreadable by someone granted one. The trace column holds
      # tool inputs and outputs, which is tenant data, so the run itself has to
      # be policied rather than only its artefacts.
      t.column   :scope_company_ids, "bigint[]", null: false
      t.string   :status, null: false, default: "running"
      t.datetime :started_at, null: false
      t.datetime :finished_at
      t.integer  :input_tokens
      t.integer  :output_tokens
      t.integer  :tool_call_count
      t.string   :model
      t.string   :llm_mode, null: false, default: "replay"
      t.jsonb    :trace, null: false, default: []
      t.timestamps
      t.index %i[agent_key started_at]
      t.index :scope_company_ids, using: :gin
    end

    create_table :agent_artefacts do |t|
      t.references :agent_run, null: false, foreign_key: true
      t.string :kind, null: false
      t.string :title, null: false
      t.jsonb  :body, null: false, default: {}
      t.timestamps
    end

    # Every claim an artefact makes, with what it was drawn from. A claim that
    # cannot name its evidence fails validation and is not shown.
    create_table :artefact_claims do |t|
      t.references :agent_artefact, null: false, foreign_key: true
      t.references :company, null: false, foreign_key: true
      t.string  :statement, null: false
      t.string  :evidence_type, null: false # metric_value | document_chunk | record
      t.string  :evidence_table
      t.bigint  :evidence_id
      t.decimal :stated_value, precision: 18, scale: 4
      t.string  :stated_unit
      t.timestamps
    end

    # --- the answer key ------------------------------------------------------
    # Written by the synthetic data generator, read only by the eval harness.
    # Unreachable by the runtime role: an agent that can read this produces a
    # perfect and meaningless score. See ADR 0004.

    create_table :ground_truths do |t|
      t.references :company, null: false, foreign_key: true
      t.string  :defect_class, null: false
      t.string  :subject_table, null: false
      t.bigint  :subject_id, null: false
      t.jsonb   :expected, null: false, default: {}
      t.string  :generator_version, null: false
      t.integer :seed, null: false
      t.timestamps
      t.index %i[defect_class company_id]
    end
  end
end
