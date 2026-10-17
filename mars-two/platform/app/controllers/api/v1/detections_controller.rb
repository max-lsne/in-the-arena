module Api
  module V1
    # The three detectors that need no model.
    #
    # Each one answers a question an agent would otherwise be tempted to answer
    # by reading rows and reasoning about them. A model asked "which accounts
    # look like they are about to churn" will produce an answer whatever the data
    # says; a ranking computed in SQL produces one that can be scored against a
    # planted answer key, which is why these are endpoints rather than prompts.
    #
    # as_of defaults to today, because a live caller means today. The eval
    # harness passes it explicitly: a detector that reads the clock makes its
    # score drift daily and fails the gate on a Tuesday. See defect 24 in the
    # build log.
    class DetectionsController < BaseController
      MAX_LIMIT = 100
      DEFAULT_CHURN_LIMIT = 10

      def crm_hygiene
        findings = ::Detection::CrmHygiene.call(company_id: company_id, as_of: as_of)

        render json: {
          as_of: as_of,
          total_findings: findings.size,
          by_kind: findings.group_by(&:kind).transform_values(&:size).sort.to_h,
          findings: findings.first(limit).map(&:to_h)
        }
      end

      def onboarding_stalls
        findings = ::Detection::OnboardingStalls.call(company_id: company_id, as_of: as_of)

        render json: {
          as_of: as_of,
          stalled_after_days: ::Detection::OnboardingStalls::STALLED_AFTER_DAYS,
          total_findings: findings.size,
          findings: findings.first(limit).map(&:to_h)
        }
      end

      # A ranking, so the response says so. Returning it as a list of flagged
      # accounts would invite an agent to report "these five are churning", which
      # is not what a score of 0.81 against a neighbour's 0.79 means.
      def churn_risk
        ranked = ::Detection::ChurnRisk.call(
          company_id: company_id, as_of: as_of, limit: limit(DEFAULT_CHURN_LIMIT)
        )

        render json: {
          as_of: as_of,
          ranking: "ordered by risk score, highest first",
          weights: ::Detection::ChurnRisk::WEIGHTS,
          accounts: ranked.map.with_index(1) { |entry, rank| entry.to_h.merge(rank: rank) }
        }
      end

      private

      def company_id = params[:company].present? ? company_from_params!.id : nil

      def as_of
        @as_of ||= params[:as_of].present? ? parsed_as_of : Date.current
      end

      # strptime, not parse. Date.parse("last tuesday") returns the Tuesday of
      # the current week rather than raising, so a mistyped parameter would
      # silently change the answer and the caller would never learn that the
      # figures they quoted were computed as of a different day.
      def parsed_as_of
        Date.strptime(params[:as_of], "%Y-%m-%d")
      rescue Date::Error, TypeError
        raise InvalidRequest, "as_of must be an ISO date, for example 2026-09-12"
      end

      def limit(default = MAX_LIMIT)
        params.fetch(:limit, default).to_i.clamp(1, MAX_LIMIT)
      end
    end
  end
end
