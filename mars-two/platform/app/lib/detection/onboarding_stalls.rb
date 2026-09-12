module Detection
  # Onboardings that have stopped moving, and the step they stopped at.
  #
  # The blocking step is the first incomplete one. Naming it is the whole point:
  # "onboarding is stalled" is a status, "stalled at identity integration for 62
  # days" is something someone can act on this afternoon.
  module OnboardingStalls
    STALLED_AFTER_DAYS = 30

    Finding = Struct.new(:onboarding, :company, :customer, :blocking_step, :days_blocked,
                         keyword_init: true) do
      def to_h
        {
          customer: customer.name,
          customer_ref: customer.external_ref,
          company: company.slug,
          blocking_step: blocking_step.name,
          blocking_step_position: blocking_step.position,
          days_blocked: days_blocked,
          started_on: onboarding.started_on
        }
      end
    end

    class << self
      def call(company_id: nil, as_of: Date.current)
        scope = Onboarding.includes(:company, :customer, :onboarding_steps).where(completed_on: nil)
        scope = scope.where(company_id: company_id) if company_id

        scope.filter_map { |onboarding| examine(onboarding, as_of) }
             .sort_by { |finding| -finding.days_blocked }
      end

      private

      def examine(onboarding, as_of)
        blocking = onboarding.onboarding_steps.sort_by(&:position).find { |s| s.completed_on.nil? }
        return nil if blocking.nil?

        # Blocked since the last completed step, or since the start if nothing
        # has been completed. Derived from the steps rather than read from the
        # blocked_since column, so the check works on records nobody annotated.
        last_progress = onboarding.onboarding_steps.filter_map(&:completed_on).max ||
                        onboarding.started_on
        days = (as_of - last_progress).to_i
        return nil if days < STALLED_AFTER_DAYS

        Finding.new(
          onboarding: onboarding, company: onboarding.company, customer: onboarding.customer,
          blocking_step: blocking, days_blocked: days
        )
      end
    end
  end
end
