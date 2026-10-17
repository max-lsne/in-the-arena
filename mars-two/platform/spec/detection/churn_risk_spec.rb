require "rails_helper"
require Rails.root.join("lib/synthetic/generator")

# Churn risk is a ranking, not a flag, and its spec is scored as one.
#
# No single signal means an account is leaving. Taken alone, overdue invoices
# identify the accounts that churn about a third of the time and angry tickets
# about a fifth. The portfolio also contains a cohort that complains, pays late,
# uses less and renews anyway, which is what stops the ranking being a lookup.
#
# Seeded with more usage history than the other specs because the score compares
# the last thirty days against the thirty before them, and fourteen days of data
# would make every decline zero.
RSpec.describe Detection::ChurnRisk, :seeded do
  AS_OF = Date.new(2026, 9, 12)

  before(:context) { Synthetic::Generator.new(usage_days: 70).run! }

  def owner(&) = ApplicationRecord.as_owner(&)

  let(:planted) { owner { GroundTruth.where(defect_class: "churn_risk").pluck(:subject_id).to_set } }

  def recall_at(k)
    owner do
      hits = Company.all.sum do |company|
        described_class.call(company_id: company.id, as_of: AS_OF, limit: k)
                       .count { |r| planted.include?(r.customer.id) }
      end
      hits.to_f / planted.size
    end
  end

  it "ranks the accounts that were planted at risk into the top five" do
    expect(recall_at(5)).to be >= 0.8
  end

  it "shows the signals behind each score rather than a bare number" do
    owner do
      ranked = described_class.call(company_id: Company.first.id, as_of: AS_OF, limit: 1).first

      expect(ranked.signals.keys).to match_array(%i[usage_decline sentiment overdue])
      expect(ranked.signals.values).to all(be_between(0, 1))
    end
  end

  it "orders by score, descending" do
    owner do
      scores = described_class.call(company_id: Company.first.id, as_of: AS_OF).map(&:score)
      expect(scores).to eq(scores.sort.reverse)
    end
  end

  it "excludes customers who have already churned" do
    owner do
      ranked_ids = described_class.call(as_of: AS_OF).map { |r| r.customer.id }
      expect(Customer.where(id: ranked_ids).where.not(churned_on: nil)).not_to exist
    end
  end

  # If one signal identified the answer, the ranking would be a lookup and the
  # score would be measuring the generator rather than the method.
  it "cannot be solved by any single signal alone" do
    owner do
      overdue = Invoice.where(status: "overdue").distinct.pluck(:customer_id).to_set
      angry = SupportTicket.where(closed_at: nil).where("sentiment < ?", -0.4)
                           .distinct.pluck(:customer_id).to_set

      [ [ "overdue invoices", overdue ], [ "angry tickets", angry ] ].each do |name, set|
        precision = (set & planted).size.to_f / [ set.size, 1 ].max
        expect(precision).to be < 0.6, "#{name} alone identifies the planted set at #{precision.round(2)} precision"
      end
    end
  end

  it "respects the caller's grant" do
    vaultline = owner { Company.find_by!(slug: "vaultline") }

    Mars::Tenancy.with([ vaultline.id ]) do
      expect(described_class.call(as_of: AS_OF).map { |r| r.company.id }.uniq).to eq([ vaultline.id ])
    end
  end
end
