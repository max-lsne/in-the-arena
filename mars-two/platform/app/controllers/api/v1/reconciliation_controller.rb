module Api
  module V1
    # Contracts whose invoices disagree with their terms.
    #
    # The discrepancy is found here, in code, because it is arithmetic. What is
    # left for an agent is the part a model is actually good at: reading the
    # clause that was breached, quoting it, and saying what to do next.
    class ReconciliationController < BaseController
      MAX_LIMIT = 50

      def contract_billing
        company_id = params[:company].present? ? company_from_params!.id : nil
        findings = ::Reconciliation::ContractBilling.call(company_id: company_id)

        render json: {
          findings: findings.first(limit).map(&:to_h),
          total_findings: findings.size,
          total_shortfall_cents: findings.sum(&:shortfall_cents),
          currency: ::Mars::Fx::BASE
        }
      end

      private

      def limit = params.fetch(:limit, MAX_LIMIT).to_i.clamp(1, MAX_LIMIT)
    end
  end
end
