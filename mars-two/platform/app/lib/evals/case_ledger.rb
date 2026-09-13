module Evals
  # One row per eval case, so a failure can be opened rather than inferred.
  #
  # DetectorScores answers "how good is this detector". This answers "which case
  # did it get wrong", which is the question error analysis actually starts from.
  # An aggregate of 0.83 recall tells you six cases were missed; it does not tell
  # you that five of the six are the same failure mode and the sixth is a bug.
  #
  # The ledger is a build artefact, written by `bin/rails evals:record` and
  # committed. It is not computed per request: the answer key is readable only by
  # the owner role, and no runtime request is going to be handed that grant to
  # render a screen. A committed ledger also makes case-level regressions show up
  # in a diff, where someone reviews them.
  module CaseLedger
    # Failures first. The view exists for the rows that are wrong, and putting
    # 37 matches above the 2 misses hides the thing you opened it to see.
    #
    # "unplanted" is not "false_positive". A detector that flags a clean record
    # has fired wrongly. A ranking that puts an unplanted account seventh has
    # done what a ranking does, and with five planted accounts per company and a
    # list of ten, half the list is unplanted before the detector runs. Calling
    # those forty rows false positives put forty failures at the top of a view
    # whose job is to surface the real ones.
    VERDICT_ORDER = %w[
      miss false_positive wrong_cause wrong_amount wrong_step wrong_kind unplanted match
    ].freeze

    class << self
      def call(as_of: DetectorScores::AS_OF)
        # Rebuilt per call rather than memoised across calls: two runs in one
        # process (a spec suite) must not share a company lookup.
        @slugs = Company.pluck(:id, :slug).to_h
        rows = revenue_leakage + crm_hygiene(as_of) + onboarding_stalls(as_of) + churn_risk(as_of)

        {
          generator_version: Synthetic::Generator::VERSION,
          seed: Synthetic::Generator::DEFAULT_SEED,
          as_of: as_of.to_s,
          cases: rows.sort_by { |row| [ VERDICT_ORDER.index(row[:verdict]) || 99, row[:detector], row[:company], row[:subject].to_s ] }
        }
      end

      private

      def planted(klass) = GroundTruth.where(defect_class: klass).to_a

      attr_reader :slugs

      def row(detector, company_id, subject, planted_side, found_side, verdict)
        {
          detector: detector, company: slugs[company_id], subject: subject,
          planted: planted_side, found: found_side, verdict: verdict
        }
      end

      def verdict_for(planted_side, found_side, mismatches)
        return "miss" if found_side.nil?
        return "false_positive" if planted_side.nil?

        mismatches.each { |name, differs| return name if differs }
        "match"
      end

      def revenue_leakage
        truth = planted("revenue_leakage").index_by(&:subject_id)
        findings = Reconciliation::ContractBilling.call.index_by { |f| f.contract.id }
        references = Contract.where(id: (truth.keys + findings.keys).uniq).pluck(:id, :reference).to_h

        (truth.keys | findings.keys).map do |contract_id|
          expected = truth[contract_id]&.expected
          finding = findings[contract_id]

          planted_side = expected && { kind: expected["kind"], amount_cents: expected["shortfall_cents"].to_i }
          found_side = finding && { kind: finding.kinds.join(", "), amount_cents: finding.shortfall_cents }

          row("revenue_leakage", (truth[contract_id] || finding.contract).company_id,
              references[contract_id], planted_side, found_side,
              verdict_for(planted_side, found_side,
                          "wrong_cause" => planted_side && found_side && found_side[:kind] != planted_side[:kind],
                          "wrong_amount" => planted_side && found_side && found_side[:amount_cents] != planted_side[:amount_cents]))
        end
      end

      def crm_hygiene(as_of)
        truth = planted("crm_hygiene").index_by { |g| [ g.subject_table, g.subject_id ] }
        findings = Detection::CrmHygiene.call(as_of: as_of).index_by { |f| [ f.subject_table, f.subject_id ] }
        references = crm_references(truth.keys | findings.keys)

        (truth.keys | findings.keys).map do |key|
          expected = truth[key]&.expected
          finding = findings[key]

          planted_side = expected && { kind: expected["kind"] }
          found_side = finding && { kind: finding.kind }

          row("crm_hygiene", truth[key]&.company_id || finding.company.id,
              references[key], planted_side, found_side,
              verdict_for(planted_side, found_side,
                          "wrong_kind" => planted_side && found_side && found_side[:kind] != planted_side[:kind]))
        end
      end

      def crm_references(keys)
        by_table = keys.group_by(&:first).transform_values { |pairs| pairs.map(&:last) }
        out = {}
        { "crm_accounts" => CrmAccount, "crm_opportunities" => CrmOpportunity }.each do |table, klass|
          next unless by_table[table]

          klass.where(id: by_table[table]).pluck(:id, :external_ref).each { |id, ref| out[[ table, id ]] = ref }
        end
        out
      end

      def onboarding_stalls(as_of)
        truth = planted("onboarding_stall").index_by(&:subject_id)
        findings = Detection::OnboardingStalls.call(as_of: as_of).index_by { |f| f.onboarding.id }
        references = Onboarding.includes(:customer).where(id: (truth.keys + findings.keys).uniq)
                               .to_h { |o| [ o.id, o.customer.external_ref ] }

        (truth.keys | findings.keys).map do |onboarding_id|
          expected = truth[onboarding_id]&.expected
          finding = findings[onboarding_id]

          planted_side = expected && { kind: expected["blocking_step"] }
          found_side = finding && { kind: finding.blocking_step.name, days_blocked: finding.days_blocked }

          row("onboarding_stalls", (truth[onboarding_id] || finding.onboarding).company_id,
              references[onboarding_id], planted_side, found_side,
              verdict_for(planted_side, found_side,
                          "wrong_step" => planted_side && found_side && found_side[:kind] != planted_side[:kind]))
        end
      end

      # A ranking, so a case is a position in a list rather than a flag.
      #
      # Rows run to the wider k that precision is scored at, not the k that
      # recall is scored at. At recall's k the list is all planted accounts and
      # the ledger has nothing to show; the rows worth reading are the ones a
      # longer list buys, which is exactly what precision@10 is measuring.
      def churn_risk(as_of)
        expected_ids = planted("churn_risk").map(&:subject_id).to_set
        rows = []

        Company.pluck(:id).each do |company_id|
          ranked = Detection::ChurnRisk.call(company_id: company_id, as_of: as_of,
                                             limit: DetectorScores::CHURN_PRECISION_K)
          ranked.each_with_index do |entry, index|
            hit = expected_ids.include?(entry.customer.id)
            rows << row("churn_risk", company_id, entry.customer.external_ref,
                        hit ? { kind: "at_risk" } : nil,
                        { kind: "ranked", rank: index + 1, score: entry.score.round(4),
                          within_recall_k: index < DetectorScores::CHURN_K },
                        hit ? "match" : "unplanted")
          end

          listed = ranked.map { |entry| entry.customer.id }.to_set
          missed = Customer.where(id: (expected_ids - listed).to_a, company_id: company_id)
          missed.pluck(:id, :external_ref).each do |_id, reference|
            rows << row("churn_risk", company_id, reference, { kind: "at_risk" }, nil, "miss")
          end
        end

        rows
      end
    end
  end
end
