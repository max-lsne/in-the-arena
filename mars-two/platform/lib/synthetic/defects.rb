module Synthetic
  # Plants defects and records exactly what was planted.
  #
  # This is the eval harness's ground truth. Without it, Layer 1 of ADR 0003 is
  # impossible and the whole evaluation strategy collapses onto asking a model
  # whether another model did well.
  #
  # Every planted defect writes a GroundTruth row carrying the affected record
  # and the expected finding, including the exact dispute amount where there is
  # one. Graders check precision and recall against these rows, and check stated
  # figures to within EUR 1.
  module Defects
    # The same rate table reconciliation uses. Planting a defect against one set
    # of rates and checking it against another would make the grader wrong in a
    # way that looks like the agent being wrong.
    # A currency worth less than the contract's, so billing at face value
    # under-collects. The first version used GBP, which is worth more than the
    # euro, so the planted "shortfall" was arithmetically an overcharge: the
    # supplier collected 17% too much and the defect was recorded as a loss. The
    # sign of a leak is not a detail.
    MISMATCH_CURRENCY = "USD".freeze

    REVENUE_LEAKS_PER_COMPANY = 4
    CRM_DEFECTS_PER_COMPANY = 5
    AT_RISK_PER_COMPANY = 5
    STALLED_ONBOARDINGS_PER_COMPANY = 2

    class << self
      def plant!(company:, spec:, rng:, today:, version:, seed:, customers:, contracts:, subscriptions:, employees:)
        @version = version
        @seed = seed
        plant_revenue_leaks(company, contracts, subscriptions, rng, today)
        plant_crm_defects(company, employees, rng, today)
        plant_churn_risk(company, spec, customers, subscriptions, rng, today)
        plant_onboarding_stalls(company, rng, today)
      end

      private

      def record(company, defect_class, subject, expected)
        GroundTruth.create!(
          company: company, defect_class: defect_class,
          subject_table: subject.class.table_name, subject_id: subject.id,
          expected: expected, generator_version: @version, seed: @seed
        )
      end

      # --- revenue leakage ---------------------------------------------------

      # Each kind is planted on a contract that actually has the term it breaches.
      #
      # The first version picked the seat-growth target from whatever was left
      # over, which meant it sometimes landed on a contract with no committed
      # user count. Nothing had been breached, and there was no clause for an
      # agent to cite, so the grader was marking agents wrong for failing to
      # quote a document that said nothing. A defect that cannot be evidenced is
      # not a defect, it is noise in the answer key.
      def plant_revenue_leaks(company, contracts, subscriptions, rng, today)
        by_customer = subscriptions.index_by(&:customer_id)
        pool = contracts.select { |c| by_customer[c.customer_id] }.shuffle(random: rng)
        used = []

        candidates = {
          uplift: ->(c) { c.terms["uplift_pct"] && (today - c.starts_on).to_i > 400 },
          discount: ->(c) { c.terms["discount_pct"] },
          seats: ->(c) { c.terms["seat_commitment"] },
          currency: ->(_c) { true }
        }

        planters = {
          uplift: ->(c) { leak_uplift_not_applied(company, c, today) },
          discount: ->(c) { leak_expired_discount(company, c, today) },
          seats: ->(c) { leak_seat_growth_unbilled(company, c, by_customer[c.customer_id], rng, today) },
          currency: ->(c) { leak_currency_mismatch(company, c, today) }
        }

        candidates.each do |kind, precondition|
          break if used.size >= REVENUE_LEAKS_PER_COMPANY

          target = (pool - used).find(&precondition)
          next unless target

          used << target if planters.fetch(kind).call(target)
        end
      end

      # Contracted uplift silently not applied after an anniversary. The expected
      # amount is what correct billing would have charged, minus what was billed.
      def leak_uplift_not_applied(company, contract, _today)
        anniversary = contract.starts_on + 365
        affected = Invoice.where(company_id: company.id, contract_id: contract.id)
                          .where(period_start: anniversary..).order(:period_start).to_a
        return false if affected.empty?

        pct = contract.terms["uplift_pct"] / 100.0
        base = (affected.first.amount_cents / (1 + pct)).round
        expected_total = affected.sum(&:amount_cents)
        Invoice.where(id: affected.map(&:id)).update_all(amount_cents: base)
        shortfall = expected_total - (base * affected.size)

        record(company, "revenue_leakage", contract, {
          kind: "uplift_not_applied",
          contract_reference: contract.reference,
          uplift_pct: contract.terms["uplift_pct"],
          affected_invoice_count: affected.size,
          shortfall_cents: shortfall
        })
        true
      end

      # Seats grew, billing did not follow.
      def leak_seat_growth_unbilled(company, contract, subscription, rng, today)
        return false unless subscription

        grew_on = today - (90 + rng.rand(120))
        extra_seats = 20 + rng.rand(180)
        old_seats = subscription.seats.to_i
        per_seat_monthly = (subscription.mrr_cents / [ old_seats, 1 ].max.to_f)
        monthly_shortfall = (per_seat_monthly * extra_seats).round

        unbilled_months = Invoice.where(company_id: company.id, contract_id: contract.id)
                                 .where(period_start: grew_on..).count
        return false if unbilled_months.zero?

        # The date is recorded so reconciliation can derive the unbilled months
        # from the record rather than from knowing how the data was made.
        subscription.update_columns(seats: old_seats + extra_seats, seats_changed_on: grew_on)

        record(company, "revenue_leakage", contract, {
          kind: "seat_growth_unbilled",
          contract_reference: contract.reference,
          seats_before: old_seats, seats_after: old_seats + extra_seats,
          grew_on: grew_on.to_s,
          unbilled_months: unbilled_months,
          shortfall_cents: monthly_shortfall * unbilled_months
        })
        true
      end

      # A discount that expired and kept being applied.
      def leak_expired_discount(company, contract, today)
        expires = Date.parse(contract.terms["discount_expires_on"])
        return false if expires >= today

        affected = Invoice.where(company_id: company.id, contract_id: contract.id)
                          .where(period_start: (expires + 1)..).order(:period_start).to_a
        return false if affected.empty?

        pct = contract.terms["discount_pct"] / 100.0
        shortfall = 0
        affected.each do |invoice|
          discounted = (invoice.amount_cents * (1 - pct)).round
          shortfall += invoice.amount_cents - discounted
          invoice.update_columns(amount_cents: discounted)
        end

        record(company, "revenue_leakage", contract, {
          kind: "expired_discount_still_applied",
          contract_reference: contract.reference,
          discount_pct: contract.terms["discount_pct"],
          expired_on: expires.to_s,
          affected_invoice_count: affected.size,
          shortfall_cents: shortfall
        })
        true
      end

      # Contract denominated in EUR, invoices raised in GBP at face value, so the
      # customer paid GBP where EUR was owed.
      def leak_currency_mismatch(company, contract, today)
        affected = Invoice.where(company_id: company.id, contract_id: contract.id)
                          .where(period_start: (today - 200)..).order(:period_start).limit(6).to_a
        return false if affected.empty?

        Invoice.where(id: affected.map(&:id)).update_all(currency: MISMATCH_CURRENCY)
        # Owed N euros, invoiced N dollars. What arrives is worth the dollar
        # rate, so the gap is what the euro amount would have been minus what
        # the dollar amount is actually worth.
        shortfall = affected.sum do |i|
          i.amount_cents - Mars::Fx.to_eur_cents(i.amount_cents, MISMATCH_CURRENCY)
        end

        record(company, "revenue_leakage", contract, {
          kind: "currency_mismatch",
          contract_reference: contract.reference,
          contract_currency: contract.currency, invoiced_currency: MISMATCH_CURRENCY,
          rate_used: Mars::Fx.rate(MISMATCH_CURRENCY),
          affected_invoice_count: affected.size,
          shortfall_cents: shortfall
        })
        true
      end

      # --- CRM hygiene -------------------------------------------------------

      def plant_crm_defects(company, employees, rng, today)
        accounts = CrmAccount.where(company_id: company.id).order(:id).to_a
        return if accounts.size < 8

        departed = employees.select(&:left_on)
        shuffled = accounts.shuffle(random: rng)

        # A duplicate account: same customer, near-identical name.
        original = shuffled[0]
        duplicate = CrmAccount.create!(
          company: company, customer_id: original.customer_id,
          owner_employee_id: original.owner_employee_id,
          external_ref: "#{original.external_ref}-DUP",
          name: original.name.sub(/\s\S+\z/, "") + " Ltd", country: original.country
        )
        record(company, "crm_hygiene", duplicate, {
          kind: "duplicate_account",
          duplicate_of_external_ref: original.external_ref,
          duplicate_external_ref: duplicate.external_ref
        })

        # An account owned by someone who has left.
        if departed.any?
          orphan = shuffled[1]
          orphan.update_columns(owner_employee_id: departed.first.id)
          record(company, "crm_hygiene", orphan, {
            kind: "owner_departed",
            account_external_ref: orphan.external_ref,
            owner_name: departed.first.name,
            owner_left_on: departed.first.left_on.to_s
          })
        end

        # Open opportunities whose close date has already passed.
        stale = CrmOpportunity.where(company_id: company.id)
                              .where.not(stage: %w[closed_won closed_lost])
                              .order(:id).limit(2).to_a
        stale.each do |opp|
          past = today - (30 + rng.rand(120))
          opp.update_columns(close_date: past, last_activity_at: (past - 20).to_time)
          record(company, "crm_hygiene", opp, {
            kind: "close_date_in_past",
            opportunity_external_ref: opp.external_ref,
            stage: opp.stage, close_date: past.to_s
          })
        end

        # An opportunity amount that contradicts the signed contract.
        linked = shuffled.find { |a| a.customer_id }
        contract = linked && Contract.find_by(company_id: company.id, customer_id: linked.customer_id)
        opp = contract && CrmOpportunity.where(company_id: company.id, crm_account_id: linked.id).first
        return unless opp && contract

        wrong = (contract.contracted_value_cents * 2.4).round
        opp.update_columns(amount_cents: wrong, stage: "closed_won")
        record(company, "crm_hygiene", opp, {
          kind: "amount_contradicts_contract",
          opportunity_external_ref: opp.external_ref,
          opportunity_amount_cents: wrong,
          contract_reference: contract.reference,
          contract_value_cents: contract.contracted_value_cents
        })
      end

      # --- churn risk --------------------------------------------------------

      # Accounts still active today that carry every leading signal. The eval is
      # a ranking task: do these appear in the agent's top k.
      def plant_churn_risk(company, spec, customers, subscriptions, rng, today)
        active = customers.reject(&:churned_on)
        return if active.size < AT_RISK_PER_COMPANY * 2

        targets = active.shuffle(random: rng).first(AT_RISK_PER_COMPANY)

        targets.each do |customer|
          # Usage falls away over the last 60 days.
          UsageDaily.where(company_id: company.id, customer_id: customer.id)
                    .where(on_date: (today - 60)..)
                    .find_each do |row|
            days_in = (row.on_date - (today - 60)).to_i
            row.update_columns(value: (row.value.to_f * (1.0 - (days_in / 75.0))).round(2).clamp(0, nil))
          end

          # Angry tickets, and more of them.
          3.times do |i|
            SupportTicket.create!(
              company: company, customer: customer,
              external_ref: "#{customer.external_ref}-RISK-#{i}",
              opened_at: (today - 45 + (i * 12)).to_time,
              closed_at: nil, priority: "high", category: "performance",
              subject: NamePools::TICKET_SUBJECTS[rng.rand(NamePools::TICKET_SUBJECTS.size)],
              sentiment: -0.55 - (rng.rand * 0.35)
            )
          end

          # Invoices going unpaid.
          Invoice.where(company_id: company.id, customer_id: customer.id)
                 .where(period_start: (today - 90)..)
                 .update_all(status: "overdue", paid_on: nil)

          record(company, "churn_risk", customer, {
            kind: "at_risk",
            customer_external_ref: customer.external_ref,
            signals: %w[usage_decline negative_sentiment open_high_priority_tickets overdue_invoices]
          })
        end
      end

      # --- onboarding stalls -------------------------------------------------

      def plant_onboarding_stalls(company, rng, today)
        stalled = Onboarding.where(company_id: company.id, completed_on: nil)
                            .order(:id).limit(STALLED_ONBOARDINGS_PER_COMPANY).to_a

        stalled.each do |onboarding|
          steps = OnboardingStep.where(company_id: company.id, onboarding_id: onboarding.id).order(:position).to_a
          blocker = steps.find { |s| s.completed_on.nil? } || steps.last
          next unless blocker

          blocked_since = today - (45 + rng.rand(90))

          # An onboarding blocked since a date must have started before it.
          # Leaving a recent start date against an older block produced a record
          # that contradicted itself, and a detector reading the steps rather
          # than the annotation saw an onboarding that had barely begun.
          started_on = [ onboarding.started_on, blocked_since - (10 + rng.rand(30)) ].min
          onboarding.update_columns(blocked_since: blocked_since, started_on: started_on)
          steps.select { |s| s.position > blocker.position }.each { |s| s.update_columns(completed_on: nil) }

          # Blocked since a date means nothing has moved since that date. Leaving
          # the completed steps at their recent dates would say the opposite, and
          # a detector reading the steps rather than the annotation would see an
          # onboarding that is progressing fine.
          done = steps.select { |s| s.completed_on }.sort_by(&:position)
          done.reverse.each_with_index do |step, back|
            step.update_columns(completed_on: blocked_since - (back * (3 + rng.rand(4))))
          end

          record(company, "onboarding_stall", onboarding, {
            kind: "stalled_at_step",
            customer_id: onboarding.customer_id,
            blocking_step: blocker.name,
            blocking_step_position: blocker.position,
            blocked_since: blocked_since.to_s,
            days_blocked: (today - blocked_since).to_i
          })
        end
      end
    end
  end
end
