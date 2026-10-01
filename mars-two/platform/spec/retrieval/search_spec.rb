require "rails_helper"

# Retrieval runs here rather than in the Python service so that row-level
# security applies to it. A vector search is still a query, and a query from a
# portfolio company executive must not return another company's contract text.
# See docs/adr/0005-retrieval.md.
RSpec.describe "Chunk retrieval", type: :model do
  let!(:vaultline) do
    seeding { Company.create!(slug: "vaultline", name: "Vaultline", country: "FR", vertical: "access_security", arr_cents: 12_000_000_00, currency: "EUR") }
  end
  let!(:meterpath) do
    seeding { Company.create!(slug: "meterpath", name: "Meterpath", country: "LV", vertical: "marketplace_billing", arr_cents: 14_500_000_00, currency: "EUR") }
  end

  def add_document(company, title, body)
    seeding do
      document = Document.create!(company: company, kind: "contract", title: title, body: body, authored_on: Date.new(2025, 1, 1))
      Mars::Chunker.call(body).each do |chunk|
        DocumentChunk.create!(
          company: company, document: document, position: chunk[:position],
          content: chunk[:content], section_ref: chunk[:section_ref],
          token_count: chunk[:token_count], embedding: Mars::Embedding.embed(chunk[:content])
        )
      end
      document
    end
  end

  before do
    add_document(vaultline, "Vaultline contract VAU-0041",
                 "4.2 Uplift\nThe Annual Fee shall increase by 4.0% on each anniversary of the Commencement Date.")
    add_document(meterpath, "Meterpath contract MET-0012",
                 "4.2 Uplift\nThe Annual Fee shall increase by 4.0% on each anniversary of the Commencement Date.")
  end

  it "finds the passage that answers the query" do
    as_user_of(vaultline) do
      hit = DocumentChunk.nearest_to(Mars::Embedding.embed("annual uplift on each anniversary")).first
      expect(hit.content).to include("4.0%")
    end
  end

  it "returns only chunks the caller is granted, even for identical text" do
    as_user_of(vaultline) do
      results = DocumentChunk.nearest_to(Mars::Embedding.embed("annual uplift on each anniversary"), limit: 10)
      expect(results.map(&:company_id).uniq).to eq([ vaultline.id ])
    end
  end

  it "returns both companies' chunks to a group-wide grant" do
    as_user_of(vaultline, meterpath) do
      results = DocumentChunk.nearest_to(Mars::Embedding.embed("annual uplift on each anniversary"), limit: 10)
      expect(results.map(&:company_id).uniq.sort).to eq([ vaultline.id, meterpath.id ].sort)
    end
  end

  it "returns nothing when no tenancy is established" do
    Mars::Tenancy.clear
    expect(DocumentChunk.nearest_to(Mars::Embedding.embed("uplift"))).to be_empty
  end

  # The finding that shaped how agents use retrieval here.
  #
  # Every uplift clause in the corpus is worded identically, because contracts
  # are. Similarity therefore cannot answer "which contract is in breach": it
  # ranks eight near-identical clauses in essentially arbitrary order, and the
  # one that matters is as likely to be second as first.
  #
  # That question belongs to SQL. The agent identifies the contract from
  # precomputed figures, then retrieval finds the clause inside that contract.
  # Composing the scopes is what makes the second step exact.
  describe "scoped to a document the caller already identified" do
    it "returns the clause from that document rather than a similar one elsewhere" do
      other = add_document(vaultline, "Vaultline contract VAU-0099",
                           "4.2 Uplift\nThe Annual Fee shall increase by 4.0% on each anniversary of the Commencement Date.")

      as_user_of(vaultline) do
        query = Mars::Embedding.embed("annual uplift on each anniversary")
        hit = DocumentChunk.where(document_id: other.id).nearest_to(query, limit: 1).first

        expect(hit.document_id).to eq(other.id)
        expect(hit.content).to include("4.0%")
      end
    end

    it "still applies tenant isolation when scoped" do
      # Read through the owner role. Looking this up with no grant returns nil,
      # because the policy is already working, and the spec would then fail on a
      # NoMethodError instead of asserting anything about isolation.
      meterpath_document = seeding { Document.find_by(company_id: meterpath.id) }

      as_user_of(vaultline) do
        query = Mars::Embedding.embed("annual uplift on each anniversary")
        expect(DocumentChunk.where(document_id: meterpath_document.id).nearest_to(query)).to be_empty
      end
    end
  end

  it "carries enough with each hit to cite it" do
    as_user_of(vaultline) do
      hit = DocumentChunk.nearest_to(Mars::Embedding.embed("annual uplift on each anniversary")).first
      expect(hit.document.title).to be_present
      expect(hit.section_ref).to be_present
      expect(hit.position).to be_present
    end
  end
end
