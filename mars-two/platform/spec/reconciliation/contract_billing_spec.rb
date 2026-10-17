require "rails_helper"
require Rails.root.join("lib/synthetic/generator")

# The half of the reconciliation agent that must not be done by a model.
#
# Finding the discrepancy is arithmetic over contract terms and invoices, and
# arithmetic is what code is for. These specs measure that arithmetic against the
# planted answer key, because an agent built on a check that misses half the
# leaks would be graded on the wrong thing.
#
# A caveat the numbers do not carry: the synthetic baseline is clean, so every
# discrepancy in it was planted. Perfect precision here means the checks are
# correct, not that the task is hard. Real billing carries credit notes, partial
# first periods and rounding noise, and adding those is the obvious next step in
# making this a real measurement.
RSpec.describe Reconciliation::ContractBilling, :seeded do
  before(:context) { Synthetic::Generator.new(usage_days: 14).run! }

  def owner(&) = ApplicationRecord.as_owner(&)

  let(:planted) { owner { GroundTruth.where(defect_class: "revenue_leakage").index_by(&:subject_id) } }
  let(:findings) { owner { described_class.call } }

  it "finds every planted leak" do
    missed = planted.keys - findings.map { |f| f.contract.id }

    expect(missed).to be_empty,
      "missed #{missed.size} planted leaks on contracts #{missed.join(', ')}"
  end

  it "flags nothing that was not planted" do
    spurious = findings.reject { |f| planted.key?(f.contract.id) }

    expect(spurious).to be_empty,
      "flagged #{spurious.size} clean contracts: #{spurious.map { |f| f.contract.reference }.join(', ')}"
  end

  it "leaves the overwhelming majority of contracts alone" do
    owner { expect(findings.size).to be < (Contract.count * 0.1) }
  end

  it "derives the shortfall to the cent" do
    owner do
      findings.each do |finding|
        expected = planted[finding.contract.id].expected["shortfall_cents"].to_i
        expect(finding.shortfall_cents).to eq(expected),
          "#{finding.contract.reference}: derived #{finding.shortfall_cents}, planted #{expected}"
      end
    end
  end

  it "names the cause that was actually planted" do
    owner do
      findings.each do |finding|
        expect(finding.kinds).to eq([ planted[finding.contract.id].expected["kind"] ]),
          "#{finding.contract.reference}: named #{finding.kinds.inspect}, planted " \
          "#{planted[finding.contract.id].expected['kind'].inspect}"
      end
    end
  end

  it "covers all four leak kinds" do
    owner do
      found = findings.flat_map(&:kinds).uniq.sort
      expect(found).to match_array(
        %w[currency_mismatch expired_discount_still_applied seat_growth_unbilled uplift_not_applied]
      )
    end
  end

  it "attaches the invoices that evidence each finding" do
    owner do
      findings.each do |finding|
        expect(finding.detail).not_to be_empty
        expect(finding.detail.first).to include(:invoice_number, :expected_cents, :billed_cents)
      end
    end
  end

  # The check has to work from the record. Reading the answer key would make it
  # score perfectly and mean nothing, which is the same trap ADR 0004 guards at
  # the database and API layers.
  it "never consults the answer key" do
    source = File.read(Rails.root.join("app/lib/reconciliation/contract_billing.rb"))

    expect(source).not_to match(/GroundTruth|ground_truth/)
  end

  describe "scoping" do
    it "can be narrowed to one company" do
      owner do
        company = Company.find_by!(slug: "vaultline")
        scoped = described_class.call(company_id: company.id)

        expect(scoped).not_to be_empty
        expect(scoped.map { |f| f.contract.company_id }.uniq).to eq([ company.id ])
      end
    end

    it "respects the caller's grant when run under one" do
      vaultline = owner { Company.find_by!(slug: "vaultline") }
      meterpath = owner { Company.find_by!(slug: "meterpath") }

      Mars::Tenancy.with([ vaultline.id ]) do
        expect(described_class.call.map { |f| f.contract.company_id }.uniq).to eq([ vaultline.id ])
      end

      Mars::Tenancy.with([ meterpath.id ]) do
        expect(described_class.call.map { |f| f.contract.company_id }).not_to include(vaultline.id)
      end
    end
  end
end
