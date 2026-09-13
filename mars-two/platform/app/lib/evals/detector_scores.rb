module Evals
  # Scores every detector that needs no model, against the planted answer key.
  #
  # These are Layer 1 of ADR 0003: where truth is known, assert against it. The
  # output is deliberately several numbers per detector rather than one, because
  # a detector that finds nine of ten planted leaks and invents three is a
  # different problem from one that finds four and invents none, and a single
  # score hides which you have.
  module DetectorScores
    AS_OF = Date.new(2026, 9, 12)
    CHURN_K = 5
    CHURN_PRECISION_K = 10

    class << self
      def call
        {
          generator_version: Synthetic::Generator::VERSION,
          seed: Synthetic::Generator::DEFAULT_SEED,
          as_of: AS_OF.to_s,
          detectors: {
            "revenue_leakage" => revenue_leakage,
            "crm_hygiene" => crm_hygiene,
            "onboarding_stalls" => onboarding_stalls,
            "churn_risk" => churn_risk
          }
        }
      end

      private

      def planted(klass) = GroundTruth.where(defect_class: klass).to_a

      # Recall and precision reported separately and never averaged. An average
      # lets a detector trade one for the other and keep the same number.
      def counts(expected_ids, found_ids)
        true_positives = (expected_ids & found_ids).size
        {
          planted: expected_ids.size,
          flagged: found_ids.size,
          true_positives: true_positives,
          false_positives: found_ids.size - true_positives,
          false_negatives: expected_ids.size - true_positives,
          recall: ratio(true_positives, expected_ids.size),
          precision: ratio(true_positives, found_ids.size)
        }
      end

      def ratio(numerator, denominator) = denominator.zero? ? 0.0 : (numerator.to_f / denominator).round(4)

      def revenue_leakage
        expected = planted("revenue_leakage")
        by_contract = expected.index_by(&:subject_id)
        findings = Reconciliation::ContractBilling.call

        amount_exact = findings.count do |finding|
          truth = by_contract[finding.contract.id]
          truth && finding.shortfall_cents == truth.expected["shortfall_cents"].to_i
        end
        cause_exact = findings.count do |finding|
          truth = by_contract[finding.contract.id]
          truth && finding.kinds == [ truth.expected["kind"] ]
        end

        counts(by_contract.keys.to_set, findings.map { |f| f.contract.id }.to_set).merge(
          amount_exact: amount_exact,
          cause_exact: cause_exact,
          amount_accuracy: ratio(amount_exact, expected.size),
          cause_accuracy: ratio(cause_exact, expected.size)
        )
      end

      # Keyed on table and id together. CRM hygiene spans accounts and
      # opportunities, and keying on the id alone silently merged an account
      # with an opportunity that happened to share a primary key: the count came
      # out one short and the accuracy read 0.973 while every other number read
      # 1.0. A metric that is quietly wrong is worse than one that is obviously
      # wrong, because nobody goes looking.
      def crm_hygiene
        expected = planted("crm_hygiene")
        by_subject = expected.index_by { |g| [ g.subject_table, g.subject_id ] }
        findings = Detection::CrmHygiene.call(as_of: AS_OF)

        kind_exact = findings.count do |finding|
          truth = by_subject[[ finding.subject_table, finding.subject_id ]]
          truth && finding.kind == truth.expected["kind"]
        end

        counts(by_subject.keys.to_set,
               findings.map { |f| [ f.subject_table, f.subject_id ] }.to_set).merge(
          kind_exact: kind_exact,
          kind_accuracy: ratio(kind_exact, expected.size),
          by_kind: expected.group_by { |g| g.expected["kind"] }.transform_values(&:size).sort.to_h
        )
      end

      def onboarding_stalls
        expected = planted("onboarding_stall")
        by_subject = expected.index_by(&:subject_id)
        findings = Detection::OnboardingStalls.call(as_of: AS_OF)

        step_exact = findings.count do |finding|
          truth = by_subject[finding.onboarding.id]
          truth && finding.blocking_step.name == truth.expected["blocking_step"]
        end

        counts(by_subject.keys.to_set, findings.map { |f| f.onboarding.id }.to_set).merge(
          step_exact: step_exact,
          step_accuracy: ratio(step_exact, expected.size)
        )
      end

      # A ranking, so scored as one. Recall at k against the number planted per
      # company, and precision at a wider k to show what a longer list costs.
      def churn_risk
        expected_ids = planted("churn_risk").map(&:subject_id).to_set

        hits = ->(k) do
          Company.all.sum do |company|
            Detection::ChurnRisk.call(company_id: company.id, as_of: AS_OF, limit: k)
                                .count { |r| expected_ids.include?(r.customer.id) }
          end
        end

        at_k = hits.call(CHURN_K)
        at_precision_k = hits.call(CHURN_PRECISION_K)
        companies = Company.count

        # The ceiling is reported next to the number because precision at a k
        # wider than the number of planted accounts cannot reach 1.0. Forty
        # planted accounts in eighty slots caps precision@10 at 0.5, so 0.5 is a
        # perfect score here and reads like a failing one without the ceiling
        # beside it.
        slots = CHURN_PRECISION_K * companies

        {
          planted: expected_ids.size,
          recall_at_k: ratio(at_k, expected_ids.size),
          k: CHURN_K,
          precision_at_k: ratio(at_precision_k, slots),
          precision_at_k_ceiling: ratio([ expected_ids.size, slots ].min, slots),
          precision_k: CHURN_PRECISION_K
        }
      end
    end
  end
end
