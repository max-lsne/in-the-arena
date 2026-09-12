module Synthetic
  # Generates the unstructured half of the corpus: contracts, board minutes and
  # support transcripts, chunked and embedded.
  #
  # The point is citability. Every contract carrying a planted revenue leak gets
  # a document containing the clause that was breached, in contract language, so
  # an agent reporting "MTR-2231 did not apply its uplift" can quote the clause
  # that says it should have. A finding without a citation is an assertion, and
  # ADR 0003's structural validators reject it.
  module Documents
    CONTRACT_SAMPLE_PER_COMPANY = 12
    BOARD_MINUTES_QUARTERS = 8
    TRANSCRIPTS_PER_COMPANY = 8

    class << self
      def generate!(company:, spec:, rng:, today:, customers:, contracts:, employees:)
        by_id = contracts.index_by(&:id)

        # Contracts with a planted defect are not optional. Without the clause in
        # the corpus there is nothing to cite, and the grader would be asking an
        # agent to quote a document that does not exist.
        defective_ids = GroundTruth.where(company_id: company.id, defect_class: "revenue_leakage")
                                   .where(subject_table: "contracts").pluck(:subject_id)

        sample = (contracts - defective_ids.filter_map { |id| by_id[id] })
                 .shuffle(random: rng).first(CONTRACT_SAMPLE_PER_COMPANY)

        (defective_ids.filter_map { |id| by_id[id] } + sample).each do |contract|
          write(company, "contract", contract_title(company, contract),
                contract_body(company, contract), contract.signed_on, contract.reference)
        end

        BOARD_MINUTES_QUARTERS.times do |i|
          quarter_end = (today << ((BOARD_MINUTES_QUARTERS - 1 - i) * 3)).end_of_month
          write(company, "board_minutes", "#{company.name} board minutes, #{quarter_label(quarter_end)}",
                board_minutes_body(company, spec, quarter_end, employees, rng), quarter_end)
        end

        at_risk_ids = GroundTruth.where(company_id: company.id, defect_class: "churn_risk").pluck(:subject_id)
        at_risk = customers.select { |c| at_risk_ids.include?(c.id) }
        others = (customers - at_risk).shuffle(random: rng)
        (at_risk + others).first(TRANSCRIPTS_PER_COMPANY).each_with_index do |customer, i|
          write(company, "support_transcript", "Support call with #{customer.name}",
                transcript_body(company, spec, customer, at_risk.include?(customer), rng),
                today - (10 + (i * 9)))
        end
      end

      private

      def write(company, kind, title, body, authored_on, source_ref = nil)
        document = Document.create!(
          company: company, kind: kind, title: title, body: body,
          authored_on: authored_on, source_ref: source_ref
        )

        rows = Mars::Chunker.call(body).map do |chunk|
          {
            company_id: company.id, document_id: document.id,
            position: chunk[:position], content: chunk[:content],
            section_ref: chunk[:section_ref], token_count: chunk[:token_count],
            embedding: Mars::Embedding.embed(chunk[:content]),
            embedding_backend: Mars::Embedding.backend_name,
            created_at: Time.current, updated_at: Time.current
          }
        end
        DocumentChunk.insert_all!(rows) if rows.any?
        document
      end

      def contract_title(company, contract) = "#{company.name} master subscription agreement #{contract.reference}"

      def money(cents, currency = "EUR") = "#{currency} #{ActiveSupport::NumberHelper.number_to_delimited(cents / 100)}"

      def long_date(date) = date.strftime("%-d %B %Y")

      def contract_body(company, contract)
        customer = Customer.find(contract.customer_id)
        annual = contract.contracted_value_cents / [ ((contract.ends_on - contract.starts_on).to_i / 365.0).round, 1 ].max

        sections = []
        sections << <<~HEAD.strip
          MASTER SUBSCRIPTION AGREEMENT
          Between #{company.name} (the Supplier) and #{customer.name} (the Customer).
          Reference #{contract.reference}. Executed #{long_date(contract.signed_on)}.
        HEAD

        sections << <<~TERM.strip
          1. Term
          This Agreement commences on #{long_date(contract.starts_on)} (the Commencement Date)
          and continues until #{contract.ends_on ? long_date(contract.ends_on) : 'terminated in accordance with clause 7'}.
        TERM

        sections << <<~FEES.strip
          2. Fees
          2.1 The Annual Fee is #{money(annual, contract.currency)}, payable monthly in arrears.
          2.2 Invoices are due thirty days from the date of issue.
        FEES

        if contract.terms["seat_commitment"]
          sections << <<~SEATS.strip
            3. Committed users
            3.1 The Committed User Count is #{contract.terms['seat_commitment']}.
            3.2 Where the Customer's actual user count exceeds the Committed User Count,
            the Supplier shall invoice the excess at the prevailing per-user rate from the
            month in which the excess arises.
          SEATS
        end

        if contract.terms["uplift_pct"]
          sections << <<~UPLIFT.strip
            4.2 Annual uplift
            The Annual Fee shall increase by #{contract.terms['uplift_pct']}% on each anniversary
            of the Commencement Date. The increase applies automatically and does not require
            notice from the Supplier.
          UPLIFT
        end

        if contract.terms["discount_pct"]
          sections << <<~DISCOUNT.strip
            5.1 Introductory discount
            A discount of #{contract.terms['discount_pct']}% applies to the Annual Fee until
            #{long_date(Date.parse(contract.terms['discount_expires_on']))}. After that date the
            full Annual Fee applies and the discount shall not be carried forward.
          DISCOUNT
        end

        sections << <<~CURRENCY.strip
          6. Currency
          6.1 All amounts under this Agreement are stated and payable in #{contract.currency}.
          6.2 Where the Customer settles in another currency, conversion is at the Customer's
          cost and does not reduce the amount owed in #{contract.currency}.
        CURRENCY

        sections << <<~TERMINATION.strip
          7. Termination
          7.1 Either party may terminate at the end of the then-current term on ninety days notice.
          7.2 Fees accrued before termination remain payable.
        TERMINATION

        sections.join("\n\n")
      end

      def quarter_label(date) = "Q#{((date.month - 1) / 3) + 1} #{date.year}"

      def board_minutes_body(company, spec, quarter_end, employees, rng)
        present = employees.reject(&:left_on).sample(3, random: rng).map(&:name)
        initiatives = Initiative.where(company_id: company.id).limit(2).pluck(:title)

        <<~MINUTES.strip
          #{company.name.upcase} BOARD MINUTES
          #{quarter_label(quarter_end)}, held #{long_date(quarter_end)}.
          Present: #{present.join(', ')}, and the Aries group operating partner.

          1. Trading
          The board reviewed recurring revenue for the quarter. #{company.name} reports on a
          #{company.arr_definition.tr('_', ' ')} basis, which differs from several other group
          companies and continues to complicate consolidated reporting. The operating partner
          asked that the definition be restated alongside the group standard from next quarter.

          2. Retention
          Gross retention held. The board noted concentration in the #{spec[:segments].first.tr('_', ' ')}
          segment and asked management to report churn by segment rather than in aggregate.

          3. Value creation
          #{initiatives.any? ? initiatives.map.with_index { |t, i| "3.#{i + 1} #{t}. Owner to report progress next quarter." }.join("\n") : '3.1 No initiatives were tabled this quarter.'}

          4. Billing and collections
          The board discussed several accounts where invoiced amounts appear inconsistent with the
          signed agreements. Management confirmed that contracted uplifts and committed user counts
          are applied manually, and that no automated reconciliation between contract terms and
          issued invoices is in place. The operating partner recorded this as a control weakness.

          5. Pipeline
          Coverage was reviewed. The board asked for opportunities whose close dates have passed to
          be either re-dated with a reason or closed, noting the forecast is otherwise overstated.

          6. Any other business
          None.
        MINUTES
      end

      def transcript_body(company, spec, customer, at_risk, rng)
        agent = Employee.where(company_id: company.id, left_on: nil).to_a.sample(1, random: rng).first&.name || "Support"
        metric = spec[:usage_metric].tr("_", " ")

        if at_risk
          <<~RISK.strip
            Support call transcript
            #{company.name} and #{customer.name}.

            1. Opening
            #{agent}: Thanks for taking the call. I can see three tickets still open on your account.

            2. Issue
            Customer: That is the problem. We raised the first one six weeks ago and it is still open.
            Our #{metric} have fallen off because half the team stopped using it. People went back to
            the old process because this one kept failing at the point they needed it.

            3. Commercial
            Customer: We also have invoices sitting unpaid because finance will not approve them while
            the service is like this. I am not going to recommend renewing on these terms. We are
            looking at what else is available before the renewal date.

            4. Actions
            #{agent}: I will escalate all three tickets today and come back to you within
            forty-eight hours with a plan and a date.
            Customer: I have heard that before. This is the last time I raise it before we make a decision.
          RISK
        else
          <<~ROUTINE.strip
            Support call transcript
            #{company.name} and #{customer.name}.

            1. Opening
            #{agent}: Checking in on the ticket you raised last week.

            2. Issue
            Customer: It resolved itself after the update. #{metric.capitalize} look normal again.

            3. Expansion
            Customer: We are adding a team next quarter, so we will need more capacity. Can you send
            what that would cost.

            4. Actions
            #{agent}: I will pass that to your account manager with a quote this week.
          ROUTINE
        end
      end
    end
  end
end
