require "zlib"
require_relative "portfolio"
require_relative "name_pools"
require_relative "defects"
require_relative "documents"

module Synthetic
  # Builds the whole synthetic portfolio, deterministically.
  #
  # Two jobs, and the second matters more. It seeds a believable operating
  # history for eight companies, and it plants defects whose exact expected
  # findings are written to ground_truths so the eval harness has something to
  # grade against. See docs/adr/0004-synthetic-data.md.
  #
  # Determinism is a hard requirement, not a nicety. Eval baselines are compared
  # across runs, so the same seed must produce the same bytes everywhere. Every
  # random draw comes from a seeded Random derived from the company slug, so
  # adding a company does not shift the data of the ones before it.
  class Generator
    VERSION = "1".freeze
    DEFAULT_SEED = 20_260_912
    HISTORY_MONTHS = 24
    USAGE_DAYS = 120

    attr_reader :seed, :today, :usage_days, :counts

    def initialize(seed: DEFAULT_SEED, today: Date.new(2026, 9, 12), usage_days: USAGE_DAYS)
      @seed = seed
      @today = today
      @usage_days = usage_days
      @counts = Hash.new(0)
    end

    def run!
      ApplicationRecord.as_owner do
        ApplicationRecord.transaction do
          purge!
          Portfolio::COMPANIES.each { |spec| build_company(spec) }
        end
      end
      counts
    end

    private

    def purge!
      tables = %w[
        ground_truths artefact_claims agent_artefacts agent_runs
        document_chunks documents metric_values initiatives
        onboarding_steps onboardings crm_opportunities crm_accounts
        support_tickets usage_daily invoice_lines invoices contracts
        subscriptions customers employees grants api_tokens users companies
      ]
      ApplicationRecord.connection.execute(
        "TRUNCATE #{tables.map { |t| %("#{t}") }.join(', ')} RESTART IDENTITY CASCADE"
      )
    end

    # Each company gets its own stream, keyed off its slug, so the data for one
    # company does not move when another is added, removed or reordered.
    def rng_for(slug) = Random.new(Zlib.crc32(slug) ^ seed)

    def build_company(spec)
      rng = rng_for(spec[:slug])
      company = Company.create!(
        slug: spec[:slug], name: spec[:name], country: spec[:country],
        vertical: spec[:vertical], currency: "EUR", arr_cents: spec[:arr_cents],
        arr_definition: spec[:arr_definition], founded_year: spec[:founded_year],
        acquired_on: Date.parse(spec[:acquired_on])
      )

      employees = build_employees(company, spec, rng)
      customers = build_customers(company, spec, rng)
      active = customers.reject(&:churned_on)

      subscriptions = build_subscriptions(company, spec, active, rng)
      contracts = build_contracts(company, spec, active, subscriptions, rng)
      build_invoices(company, contracts, subscriptions, rng)
      build_usage(company, spec, customers, rng)
      build_tickets(company, customers, rng)
      build_crm(company, spec, customers, employees, rng)
      build_onboardings(company, customers, rng)
      build_initiatives(company, employees, rng)

      # Scatter the individual risk signals across the population before any are
      # planted together.
      #
      # Without this, "has an overdue invoice" identified the at-risk set
      # exactly, and a one-line query scored full recall. That is not a churn
      # model, it is reading the answer key through a side channel. Real accounts
      # pay late, complain, and go quiet for reasons that are not churn, and the
      # skill is weighing the combination.
      scatter_risk_signals(company, customers, rng)

      Defects.plant!(
        company: company, spec: spec, rng: rng, today: today,
        version: VERSION, seed: seed,
        customers: customers, contracts: contracts,
        subscriptions: subscriptions, employees: employees
      )

      # After the defects, not before. A contract carrying a planted leak needs a
      # document containing the clause that was breached, and which contracts
      # those are is only known once they have been planted.
      Documents.generate!(
        company: company, spec: spec, rng: rng, today: today,
        customers: customers, contracts: contracts, employees: employees
      )
      count(:documents, Document.where(company_id: company.id).count)
      count(:document_chunks, DocumentChunk.where(company_id: company.id).count)

      count(:companies)
    end

    def build_employees(company, spec, rng)
      n = 8 + rng.rand(12)
      rows = Array.new(n) do |i|
        first = NamePools::FIRST_NAMES[rng.rand(NamePools::FIRST_NAMES.size)]
        last = NamePools::LAST_NAMES[rng.rand(NamePools::LAST_NAMES.size)]
        started = today - (200 + rng.rand(2200))
        # A few people have left. The CRM hygiene defect leans on this.
        left = rng.rand < 0.18 ? started + 200 + rng.rand(1500) : nil
        left = nil if left && left > today
        {
          company_id: company.id, name: "#{first} #{last}",
          email: "#{first.downcase.gsub(/[^a-z]/, '')}.#{last.downcase.gsub(/[^a-z]/, '')}#{i}@#{spec[:slug]}.example",
          job_role: NamePools::JOB_ROLES[rng.rand(NamePools::JOB_ROLES.size)],
          started_on: started, left_on: left,
          created_at: Time.current, updated_at: Time.current
        }
      end
      Employee.insert_all!(rows)
      count(:employees, rows.size)
      Employee.where(company_id: company.id).to_a
    end

    def build_customers(company, spec, rng)
      countries = NamePools::SPREAD.fetch(spec[:country])
      churn_count = (spec[:customer_count] * spec[:churn_rate]).round

      rows = Array.new(spec[:customer_count]) do |i|
        country = countries[rng.rand(countries.size)]
        prefix_pool = NamePools::CUSTOMER_PREFIX.fetch(country, NamePools::CUSTOMER_PREFIX["GB"])
        name = "#{prefix_pool[rng.rand(prefix_pool.size)]} #{NamePools::CUSTOMER_SUFFIX[rng.rand(NamePools::CUSTOMER_SUFFIX.size)]}"
        first_seen = today - (90 + rng.rand(2500))
        {
          company_id: company.id,
          external_ref: format("%s-C%04d", spec[:slug][0, 3].upcase, i + 1),
          name: name, country: country,
          segment: spec[:segments][rng.rand(spec[:segments].size)],
          first_seen_on: first_seen, churned_on: nil,
          created_at: Time.current, updated_at: Time.current
        }
      end

      # Churn the last N, spread across the past year rather than bunched.
      rows.last(churn_count).each_with_index do |row, i|
        row[:churned_on] = today - (20 + ((i * 330) / [ churn_count, 1 ].max) + rng.rand(18))
      end

      Customer.insert_all!(rows)
      count(:customers, rows.size)
      Customer.where(company_id: company.id).order(:id).to_a
    end

    # Allocates the company's headline ARR across its active customers so the sum
    # is exact. Weights are drawn to be lumpy, because real portfolios are: a few
    # large accounts carry most of the revenue.
    def build_subscriptions(company, spec, active, rng)
      weights = active.map { (rng.rand**2.2) + 0.02 }
      total_weight = weights.sum
      annual = spec[:arr_cents]

      # Allocate the monthly figure, not the annual one. Allocating annually and
      # then dividing by twelve rounds once per customer, so the annualised sum
      # drifts from the headline by up to six cents times the customer count.
      # Allocating monthly rounds once per customer on a number that is then
      # multiplied back up, which bounds the total drift at twelve cents for the
      # whole company regardless of how many customers it has.
      monthly = (annual / 12.0).round
      allocations = weights.map { |w| ((monthly * w) / total_weight).round }
      allocations[allocations.index(allocations.max)] += monthly - allocations.sum

      rows = active.each_with_index.map do |customer, i|
        monthly_cents = [ allocations[i], 1 ].max
        annual_cents = monthly_cents * 12
        seats = spec[:seat_band].to_a[rng.rand(spec[:seat_band].size)]
        unit_price = [ (annual_cents / [ seats, 1 ].max), 100 ].max
        {
          company_id: company.id, customer_id: customer.id,
          plan: spec[:plans][rng.rand(spec[:plans].size)],
          seats: seats, unit_price_cents: unit_price, currency: "EUR",
          mrr_cents: monthly_cents,
          started_on: customer.first_seen_on + rng.rand(30),
          ends_on: nil, status: "active",
          created_at: Time.current, updated_at: Time.current
        }
      end

      Subscription.insert_all!(rows)
      count(:subscriptions, rows.size)

      subs = Subscription.where(company_id: company.id).order(:id).to_a
      # Twelve cents across the whole company: one rounding of the monthly
      # figure, multiplied back up. Anything larger is a bug in the allocation,
      # not floating point.
      allocated = rows.sum { |r| r[:mrr_cents] * 12 }
      drift = (allocated - annual).abs
      raise "ARR allocation drifted by #{drift} cents for #{spec[:slug]}" if drift > 12
      subs
    end

    def build_contracts(company, spec, active, subscriptions, rng)
      by_customer = subscriptions.index_by(&:customer_id)

      rows = active.each_with_index.map do |customer, i|
        sub = by_customer[customer.id]
        signed = customer.first_seen_on
        term_years = [ 1, 1, 2, 3 ][rng.rand(4)]
        annual = sub.mrr_cents * 12

        terms = {}
        terms["uplift_pct"] = [ 3.0, 4.0, 5.0 ][rng.rand(3)] if rng.rand < 0.55
        terms["seat_commitment"] = sub.seats if rng.rand < 0.45
        if rng.rand < 0.30
          terms["discount_pct"] = [ 5.0, 10.0, 15.0 ][rng.rand(3)]
          terms["discount_expires_on"] = (signed + 365).to_s
        end

        {
          company_id: company.id, customer_id: customer.id,
          reference: format("%s-%04d", spec[:slug][0, 3].upcase, i + 1),
          signed_on: signed, starts_on: signed + 1,
          ends_on: signed + (365 * term_years),
          currency: "EUR", contracted_value_cents: annual * term_years,
          terms: terms,
          created_at: Time.current, updated_at: Time.current
        }
      end

      Contract.insert_all!(rows)
      count(:contracts, rows.size)
      Contract.where(company_id: company.id).order(:id).to_a
    end

    def build_invoices(company, contracts, subscriptions, rng)
      by_customer = subscriptions.index_by(&:customer_id)
      invoice_rows = []
      seq = 0

      contracts.each do |contract|
        sub = by_customer[contract.customer_id]
        next unless sub

        months = HISTORY_MONTHS
        months.times do |m|
          period_start = (today << (months - 1 - m)).beginning_of_month
          next if period_start < contract.starts_on

          seq += 1
          amount = sub.mrr_cents

          # Contracted uplift compounds on each anniversary. Billing that
          # honours the contract is the baseline; the reconciliation defect is
          # planted later by removing it from selected contracts, so a leak is
          # a real departure from correct behaviour rather than an absence of
          # behaviour that was never implemented.
          if contract.terms["uplift_pct"]
            anniversaries = ((period_start - contract.starts_on).to_i / 365)
            amount = (amount * ((1 + (contract.terms["uplift_pct"] / 100.0))**anniversaries)).round if anniversaries.positive?
          end

          if contract.terms["discount_pct"]
            expires = contract.terms["discount_expires_on"]&.then { |d| Date.parse(d) }
            amount = (amount * (1 - (contract.terms["discount_pct"] / 100.0))).round if expires && period_start <= expires
          end

          invoice_rows << {
            company_id: company.id, customer_id: contract.customer_id,
            contract_id: contract.id,
            number: format("%s-INV-%06d", company.slug[0, 3].upcase, seq),
            issued_on: period_start, period_start: period_start,
            period_end: period_start.end_of_month, currency: "EUR",
            amount_cents: amount, status: "paid",
            paid_on: period_start + 14 + rng.rand(30),
            created_at: Time.current, updated_at: Time.current
          }
        end
      end

      invoice_rows.each_slice(5_000) { |slice| Invoice.insert_all!(slice) }
      count(:invoices, invoice_rows.size)
    end

    def build_usage(company, spec, customers, rng)
      rows = []
      customers.each do |customer|
        base = 20 + rng.rand(900)
        usage_days.times do |d|
          on = today - (usage_days - 1 - d)
          next if customer.churned_on && on > customer.churned_on
          next if customer.first_seen_on && on < customer.first_seen_on

          # Gentle weekly seasonality plus noise, so a decline is detectable
          # rather than obvious.
          weekday = on.wday.between?(1, 5) ? 1.0 : 0.35
          drift = 1.0 + ((d - (usage_days / 2.0)) / (usage_days * 6.0))
          value = (base * weekday * drift * (0.85 + (rng.rand * 0.3))).round(2)

          rows << {
            company_id: company.id, customer_id: customer.id,
            on_date: on, metric_key: spec[:usage_metric], value: value
          }
        end
      end
      rows.each_slice(10_000) { |slice| UsageDaily.insert_all!(slice) }
      count(:usage_daily, rows.size)
    end

    def build_tickets(company, customers, rng)
      rows = []
      customers.each_with_index do |customer, ci|
        n = rng.rand(9)
        n.times do |t|
          opened = today - rng.rand(usage_days)
          closed = rng.rand < 0.78 ? opened + rng.rand(9) : nil
          rows << {
            company_id: company.id, customer_id: customer.id,
            external_ref: format("%s-T%05d", company.slug[0, 3].upcase, (ci * 20) + t + 1),
            opened_at: opened.to_time + rng.rand(9).hours,
            closed_at: closed&.to_time,
            priority: %w[low normal normal high urgent][rng.rand(5)],
            category: %w[access billing performance data integration][rng.rand(5)],
            subject: NamePools::TICKET_SUBJECTS[rng.rand(NamePools::TICKET_SUBJECTS.size)],
            sentiment: (-0.6 + (rng.rand * 1.4)).round(3),
            created_at: Time.current, updated_at: Time.current
          }
        end
      end
      rows.each_slice(5_000) { |slice| SupportTicket.insert_all!(slice) }
      count(:support_tickets, rows.size)
    end

    def build_crm(company, spec, customers, employees, rng)
      # Correct behaviour is the baseline, in the CRM as much as in billing.
      #
      # Owners were drawn from everyone including leavers, open opportunities
      # were given close dates up to forty days in the past, and closed-won
      # amounts were unrelated to the contracts they closed. Against that
      # baseline the hygiene checks flagged 67, 221 and 224 records where 6, 16
      # and 8 had been planted, so a detector could score well while finding
      # almost nothing that was put there. A defect has to be a departure from
      # a clean baseline or there is nothing to measure.
      current = employees.reject(&:left_on)
      current = employees if current.empty?

      account_rows = customers.each_with_index.map do |customer, i|
        {
          company_id: company.id, customer_id: customer.id,
          owner_employee_id: current[rng.rand(current.size)].id,
          external_ref: format("%s-A%04d", company.slug[0, 3].upcase, i + 1),
          name: customer.name, country: customer.country,
          created_at: Time.current, updated_at: Time.current
        }
      end
      CrmAccount.insert_all!(account_rows)
      count(:crm_accounts, account_rows.size)

      accounts = CrmAccount.where(company_id: company.id).order(:id).to_a
      contract_values = Contract.where(company_id: company.id).pluck(:customer_id, :contracted_value_cents).to_h
      stages = %w[qualify discover propose negotiate closed_won closed_lost]
      opp_rows = []
      accounts.each_with_index do |account, i|
        (1 + rng.rand(3)).times do |j|
          stage = stages[rng.rand(stages.size)]
          closed = %w[closed_won closed_lost].include?(stage)

          # An open opportunity closes in the future. One whose date has passed
          # without being closed is the hygiene defect, so it cannot also be the
          # norm.
          close_date = closed ? today - rng.rand(200) : today + 10 + rng.rand(170)

          # Closing a deal means signing the contract, so a won opportunity is
          # worth what the contract is worth. An amount that disagrees is the
          # defect.
          amount = if stage == "closed_won" && contract_values[account.customer_id]
                     contract_values[account.customer_id]
          else
                     5_000_00 + rng.rand(400_000_00)
          end

          opp_rows << {
            company_id: company.id, crm_account_id: account.id,
            owner_employee_id: current[rng.rand(current.size)].id,
            external_ref: format("%s-O%05d", company.slug[0, 3].upcase, (i * 5) + j + 1),
            name: "#{account.name} #{spec[:plans][rng.rand(spec[:plans].size)]} expansion",
            stage: stage,
            amount_cents: amount,
            currency: "EUR",
            close_date: close_date,
            last_activity_at: (today - rng.rand(90)).to_time,
            created_at: Time.current, updated_at: Time.current
          }
        end
      end
      opp_rows.each_slice(5_000) { |slice| CrmOpportunity.insert_all!(slice) }
      count(:crm_opportunities, opp_rows.size)
    end

    def build_onboardings(company, customers, rng)
      recent = customers.select { |c| c.first_seen_on && c.first_seen_on > today - 400 }
      return if recent.empty?

      onboarding_rows = recent.map do |customer|
        done = rng.rand < 0.62

        # A finished onboarding started when the customer signed. An unfinished
        # one started recently, because an onboarding that began a year ago and
        # has completed nothing is not in progress, it is stalled. Leaving those
        # in the baseline meant the stall detector was right about records the
        # answer key had never marked, which reads as a precision problem and is
        # really an incomplete answer key.
        started = if done
                    customer.first_seen_on + rng.rand(10)
        else
                    [ customer.first_seen_on + rng.rand(10), today - (5 + rng.rand(22)) ].max
        end

        {
          company_id: company.id, customer_id: customer.id,
          started_on: started,
          completed_on: done ? started + 30 + rng.rand(60) : nil,
          blocked_since: nil,
          created_at: Time.current, updated_at: Time.current
        }
      end
      Onboarding.insert_all!(onboarding_rows)
      count(:onboardings, onboarding_rows.size)

      onboardings = Onboarding.where(company_id: company.id).order(:id).to_a
      step_rows = []
      onboardings.each do |onboarding|
        finished = onboarding.completed_on
        completed_through = finished ? NamePools::ONBOARDING_STEPS.size : rng.rand(NamePools::ONBOARDING_STEPS.size)

        # An onboarding still in progress has been progressing. Anchoring its
        # completed steps to a start date a year ago made every unfinished
        # onboarding look abandoned, so a stall detector flagged 34 where 13 had
        # been planted and the twenty-one extras were real by the definition.
        # The answer key was incomplete rather than the detector wrong, which is
        # the harder failure to notice. A genuinely stalled onboarding has to be
        # a departure from a baseline that is moving.
        last_progress = finished ? nil : [ today - rng.rand(24), onboarding.started_on ].max

        NamePools::ONBOARDING_STEPS.each_with_index do |name, idx|
          completed_on =
            if idx >= completed_through
              nil
            elsif finished
              onboarding.started_on + (idx * 6) + rng.rand(5)
            else
              last_progress - ((completed_through - 1 - idx) * (4 + rng.rand(4)))
            end

          step_rows << {
            company_id: company.id, onboarding_id: onboarding.id,
            name: name, position: idx + 1,
            completed_on: completed_on,
            created_at: Time.current, updated_at: Time.current
          }
        end
      end
      step_rows.each_slice(5_000) { |slice| OnboardingStep.insert_all!(slice) }
      count(:onboarding_steps, step_rows.size)
    end

    # Each initiative targets a metric the rollup actually computes, with a
    # baseline and target in that metric's own unit.
    #
    # The first version drew both from one range of 50 to 110 whatever the
    # metric was, so an initiative to lift net revenue retention carried a
    # baseline of 50 against a measured ratio of 1.027. Progress came out at
    # 4.65, which reads as "four and a half times past target" and is noise.
    # Two of the five also named metrics nothing computes, so their progress was
    # permanently null.
    INITIATIVE_TEMPLATES = [
      { title: "Lift net revenue retention above 108%", metric: "net_revenue_retention", unit: "ratio",
        baseline: ->(r) { (0.94 + (r.rand * 0.06)).round(4) }, target: ->(r) { (1.06 + (r.rand * 0.06)).round(4) } },
      { title: "Cut median time to first value below 35 days", metric: "median_onboarding_days", unit: "days",
        baseline: ->(r) { (48 + r.rand(24)).to_f }, target: ->(r) { (24 + r.rand(10)).to_f } },
      { title: "Halve the open support backlog", metric: "open_tickets", unit: "count",
        baseline: ->(r) { (90 + r.rand(60)).to_f }, target: ->(r) { (35 + r.rand(20)).to_f } },
      { title: "Clear overdue invoices below EUR 100k", metric: "overdue_invoice_cents", unit: "eur_cents",
        baseline: ->(r) { (300_000_00 + r.rand(200_000_00)).to_f }, target: ->(r) { (50_000_00 + r.rand(50_000_00)).to_f } },
      { title: "Hold gross churn under 5%", metric: "gross_churn_rate", unit: "ratio",
        baseline: ->(r) { (0.06 + (r.rand * 0.04)).round(4) }, target: ->(r) { (0.03 + (r.rand * 0.02)).round(4) } },
      { title: "Build pipeline coverage to 4x", metric: "pipeline_coverage", unit: "multiple",
        baseline: ->(r) { (2.0 + r.rand).round(4) }, target: ->(r) { (3.8 + (r.rand * 0.6)).round(4) } }
    ].freeze

    def build_initiatives(company, employees, rng)
      rows = INITIATIVE_TEMPLATES.sample(3 + rng.rand(2), random: rng).map do |template|
        {
          company_id: company.id,
          owner_employee_id: employees[rng.rand(employees.size)].id,
          title: template[:title],
          thesis: "Agreed at the #{company.acquired_on&.year || 2025} value creation review.",
          status: %w[in_progress in_progress at_risk done][rng.rand(4)],
          target_metric_key: template[:metric],
          target_unit: template[:unit],
          baseline_value: template[:baseline].call(rng),
          target_value: template[:target].call(rng),
          due_on: today + 60 + rng.rand(300),
          created_at: Time.current, updated_at: Time.current
        }
      end
      Initiative.insert_all!(rows)
      count(:initiatives, rows.size)
    end

    # Independent draws, so a minority of customers carry two signals by chance
    # and a handful carry all three without being at risk. That is what makes the
    # ranking a judgement rather than a lookup.
    def scatter_risk_signals(company, customers, rng)
      active = customers.reject(&:churned_on)

      active.each do |customer|
        # A cohort that is loudly unhappy and renews anyway. Independent draws
        # put all three signals on half a percent of accounts, which is not
        # enough to make the ranking a judgement: the planted accounts saturated
        # every counter and nothing else came close, so recall at five was a
        # hundred percent and meant nothing. Real portfolios are full of accounts
        # that complain, pay late, use less, and stay.
        grumpy = rng.rand < 0.06
        intensity = grumpy ? 2 + rng.rand(3) : 1 + rng.rand(2)

        if grumpy || rng.rand < 0.12
          Invoice.where(company_id: company.id, customer_id: customer.id)
                 .order(period_start: :desc).limit(intensity)
                 .update_all(status: "overdue", paid_on: nil)
        end

        (grumpy ? intensity : 1).times do |n|
          next unless grumpy || rng.rand < 0.18

          SupportTicket.create!(
            company: company, customer: customer,
            external_ref: "#{customer.external_ref}-N#{n}#{rng.rand(9999)}",
            opened_at: (today - rng.rand(60)).to_time,
            closed_at: nil, priority: %w[normal high][rng.rand(2)],
            category: %w[billing performance data][rng.rand(3)],
            subject: NamePools::TICKET_SUBJECTS[rng.rand(NamePools::TICKET_SUBJECTS.size)],
            sentiment: (-0.75 + (rng.rand * 0.2)).round(3)
          )
          count(:support_tickets)
        end

        next unless grumpy || rng.rand < 0.22

        # A dip, not a collapse. The planted accounts decline steeply and keep
        # declining; these wobble and hold.
        factor = grumpy ? 0.6 + (rng.rand * 0.2) : 0.7 + (rng.rand * 0.2)
        UsageDaily.where(company_id: company.id, customer_id: customer.id)
                  .where(on_date: (today - 30)..)
                  .update_all(Arel.sql("value = ROUND(value * #{factor}, 2)"))
      end
    end

    def count(key, n = 1) = @counts[key] += n
  end
end
