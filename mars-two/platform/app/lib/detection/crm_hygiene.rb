module Detection
  # CRM records that contradict something else on the record.
  #
  # Each check compares two sources that ought to agree, rather than applying a
  # rule of thumb. An account owned by someone who left, an open opportunity
  # whose close date has passed, two accounts for one customer, and a won deal
  # worth something other than the contract it closed.
  module CrmHygiene
    AMOUNT_TOLERANCE = 0.2

    Finding = Struct.new(:kind, :subject_table, :subject_id, :reference, :company, :detail,
                         keyword_init: true) do
      def to_h
        { kind: kind, reference: reference, company: company.slug, detail: detail }
      end
    end

    class << self
      def call(company_id: nil)
        departed_owners(company_id) + stale_opportunities(company_id) +
          duplicate_accounts(company_id) + amount_disagreements(company_id)
      end

      private

      def scope(relation, company_id) = company_id ? relation.where(company_id: company_id) : relation

      def departed_owners(company_id)
        scope(CrmAccount.includes(:company, :owner_employee), company_id)
          .joins(:owner_employee).where.not(employees: { left_on: nil })
          .map do |account|
            Finding.new(
              kind: "owner_departed", subject_table: "crm_accounts", subject_id: account.id,
              reference: account.external_ref, company: account.company,
              detail: { owner: account.owner_employee.name, left_on: account.owner_employee.left_on }
            )
          end
      end

      def stale_opportunities(company_id)
        scope(CrmOpportunity.includes(:company), company_id)
          .where.not(stage: %w[closed_won closed_lost])
          .where(close_date: ...Date.current)
          .map do |opportunity|
            Finding.new(
              kind: "close_date_in_past", subject_table: "crm_opportunities",
              subject_id: opportunity.id, reference: opportunity.external_ref,
              company: opportunity.company,
              detail: { stage: opportunity.stage, close_date: opportunity.close_date,
                        days_overdue: (Date.current - opportunity.close_date).to_i }
            )
          end
      end

      # The later of the two accounts is the duplicate, because the earlier one
      # is the record everything else already points at.
      def duplicate_accounts(company_id)
        pairs = scope(CrmAccount, company_id).where.not(customer_id: nil)
                                            .group(:company_id, :customer_id)
                                            .having("count(*) > 1").count.keys

        pairs.flat_map do |company, customer|
          accounts = CrmAccount.includes(:company)
                               .where(company_id: company, customer_id: customer).order(:id).to_a
          accounts.drop(1).map do |duplicate|
            Finding.new(
              kind: "duplicate_account", subject_table: "crm_accounts", subject_id: duplicate.id,
              reference: duplicate.external_ref, company: duplicate.company,
              detail: { duplicate_of: accounts.first.external_ref, name: duplicate.name }
            )
          end
        end
      end

      # Closing a deal means signing the contract, so a won opportunity should be
      # worth what the contract is worth.
      def amount_disagreements(company_id)
        won = scope(CrmOpportunity.includes(:company, crm_account: :customer), company_id)
              .where(stage: "closed_won").where.not(amount_cents: nil)
        contracts = Contract.where(company_id: won.map(&:company_id).uniq)
                            .index_by { |c| [ c.company_id, c.customer_id ] }

        won.filter_map do |opportunity|
          customer_id = opportunity.crm_account&.customer_id
          contract = contracts[[ opportunity.company_id, customer_id ]]
          next if contract.nil? || contract.contracted_value_cents.zero?

          drift = (opportunity.amount_cents - contract.contracted_value_cents).abs /
                  contract.contracted_value_cents.to_f
          next if drift <= AMOUNT_TOLERANCE

          Finding.new(
            kind: "amount_contradicts_contract", subject_table: "crm_opportunities",
            subject_id: opportunity.id, reference: opportunity.external_ref,
            company: opportunity.company,
            detail: { opportunity_amount_cents: opportunity.amount_cents,
                      contract_reference: contract.reference,
                      contract_value_cents: contract.contracted_value_cents }
          )
        end
      end
    end
  end
end
