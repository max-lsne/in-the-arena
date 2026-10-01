module Reconciliation
  # Compares what each contract says it is owed against what was actually
  # invoiced, in SQL and Ruby, from the record alone.
  #
  # This is the half of the reconciliation agent that must not be done by a
  # model. Finding the discrepancy is arithmetic over contract terms and
  # invoices, and arithmetic is what code is for. What is left for the agent is
  # the part a model is good at: reading the clause that was breached, quoting
  # it, and saying what to do about it.
  #
  # Everything here is derived from the contract, its subscription and its
  # invoices. Nothing consults the answer key.
  module ContractBilling
    TOLERANCE_CENTS = 100

    Finding = Struct.new(
      :contract, :kinds, :shortfall_cents, :invoices_checked, :detail,
      keyword_init: true
    ) do
      def to_h
        {
          contract_reference: contract.reference,
          company: contract.company.slug,
          kinds: kinds,
          shortfall_cents: shortfall_cents,
          invoices_checked: invoices_checked,
          detail: detail
        }
      end
    end

    class << self
      def call(company_id: nil)
        contracts = Contract.includes(:company, :customer)
        contracts = contracts.where(company_id: company_id) if company_id

        contracts.filter_map { |contract| examine(contract) }
                 .sort_by { |f| -f.shortfall_cents }
      end

      private

      def examine(contract)
        invoices = Invoice.where(contract_id: contract.id).order(:period_start).to_a
        return nil if invoices.empty?

        subscription = Subscription.find_by(
          company_id: contract.company_id, customer_id: contract.customer_id
        )
        base = base_monthly_cents(contract)
        return nil if base.zero?

        kinds = []
        shortfall = 0
        detail = []

        invoices.each do |invoice|
          expected = expected_cents(contract, subscription, base, invoice)
          received = Mars::Fx.to_eur_cents(invoice.amount_cents, invoice.currency)
          gap = expected - received
          next if gap <= TOLERANCE_CENTS

          shortfall += gap
          kinds.concat(attribute(contract, subscription, base, invoice, expected))
          detail << {
            invoice_number: invoice.number,
            period_start: invoice.period_start,
            expected_cents: expected,
            billed_cents: invoice.amount_cents,
            billed_currency: invoice.currency,
            gap_cents: gap
          }
        end

        return nil if shortfall <= TOLERANCE_CENTS

        Finding.new(
          contract: contract, kinds: kinds.uniq.sort, shortfall_cents: shortfall,
          invoices_checked: invoices.size, detail: detail.last(6)
        )
      end

      # Name the one cause that best explains the number.
      #
      # Two versions were wrong before this one. The first named a cause whenever
      # the contract carried the matching clause, so a contract with an uplift
      # term and an expired discount was reported as failing both when only the
      # discount had been missed. The second inferred each cause independently
      # from the billed amount, which is ambiguous: unbilled seats that happen to
      # be worth about three percent of the fee produce the same ratio as one
      # missed three percent uplift, and both fired.
      #
      # A discrepancy has one cause. So each applicable hypothesis predicts what
      # would have been billed, and the closest prediction wins. Currency is the
      # exception and is not inferred at all: a euro contract invoiced in dollars
      # is a fact on the record, not a deduction from an amount.
      def attribute(contract, subscription, base, invoice, expected)
        return [ "currency_mismatch" ] if invoice.currency != contract.currency

        billed = invoice.amount_cents.to_f
        return [] if billed <= 0

        best = hypotheses(contract, subscription, base, invoice, expected)
               .map { |cause, predicted| [ cause, ((billed - predicted).abs / billed) ] }
               .select { |_, error| error < 0.002 }
               .min_by { |_, error| error }

        best ? [ best.first ] : []
      end

      # What each failure would have left on the invoice, for the failures this
      # contract could actually have.
      def hypotheses(contract, subscription, base, invoice, expected)
        out = {}

        if (uplift = contract.terms["uplift_pct"])
          anniversaries = ((invoice.period_start - contract.starts_on).to_i / 365)
          if anniversaries.positive?
            step = 1 + (uplift / 100.0)
            frozen = (1..anniversaries).map { |m| expected / (step**m) }
            out["uplift_not_applied"] = frozen.min_by { |p| (invoice.amount_cents - p).abs }
          end
        end

        if (discount = contract.terms["discount_pct"])
          expires = contract.terms["discount_expires_on"]&.then { |d| Date.parse(d) }
          if expires && invoice.period_start > expires
            out["expired_discount_still_applied"] = expected * (1 - (discount / 100.0))
          end
        end

        commitment = contract.terms["seat_commitment"]
        if commitment && subscription&.seats.to_i > commitment.to_i &&
           subscription.seats_changed_on && invoice.period_start >= subscription.seats_changed_on
          out["seat_growth_unbilled"] =
            expected - ((base / commitment.to_f) * (subscription.seats - commitment))
        end

        out
      end

      # Within a fifth of a percent, which absorbs the rounding that compounding
      # an uplift twelve times introduces without matching an unrelated amount.
      def close?(actual, predicted)
        return false if predicted.to_f.zero?

        ((actual - predicted).abs / predicted.to_f) < 0.002
      end

      # The contract states a total and a term. Everything else is derived from
      # it, so the check does not depend on the subscription's current state,
      # which is the thing that may have drifted.
      def base_monthly_cents(contract)
        return 0 if contract.ends_on.nil?

        years = ((contract.ends_on - contract.starts_on).to_i / 365.0).round
        return 0 if years.zero?

        contract.contracted_value_cents / (years * 12)
      end

      def expected_cents(contract, subscription, base, invoice)
        expected = base

        if (uplift = contract.terms["uplift_pct"])
          anniversaries = ((invoice.period_start - contract.starts_on).to_i / 365)
          expected = (expected * ((1 + (uplift / 100.0))**anniversaries)).round if anniversaries.positive?
        end

        if (discount = contract.terms["discount_pct"])
          expires = contract.terms["discount_expires_on"]&.then { |d| Date.parse(d) }
          expected = (expected * (1 - (discount / 100.0))).round if expires && invoice.period_start <= expires
        end

        commitment = contract.terms["seat_commitment"]
        if commitment && subscription&.seats.to_i > commitment.to_i &&
           subscription.seats_changed_on && invoice.period_start >= subscription.seats_changed_on
          expected += ((base / commitment.to_f) * (subscription.seats - commitment)).round
        end

        expected
      end
    end
  end
end
