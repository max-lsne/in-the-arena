require "rails_helper"

# Retrieval over the document corpus, scoped by the caller's grant because the
# query runs against a policied table. See docs/adr/0005-retrieval.md.
RSpec.describe "Retrieval API", type: :request do
  let!(:vaultline) do
    ApplicationRecord.as_owner do
      Company.create!(slug: "vaultline", name: "Vaultline", country: "FR",
                      vertical: "access_security", arr_cents: 12_000_000_00, currency: "EUR")
    end
  end
  let!(:meterpath) do
    ApplicationRecord.as_owner do
      Company.create!(slug: "meterpath", name: "Meterpath", country: "LV",
                      vertical: "marketplace_billing", arr_cents: 14_500_000_00, currency: "EUR")
    end
  end

  def add_contract_document(company, reference)
    ApplicationRecord.as_owner do
      body = "4.2 Annual uplift\nThe Annual Fee shall increase by 4.0% on each anniversary of the Commencement Date."
      document = Document.create!(company: company, kind: "contract", source_ref: reference,
                                  title: "#{company.name} master subscription agreement #{reference}",
                                  body: body, authored_on: Date.new(2025, 1, 1))
      Mars::Chunker.call(body).each do |chunk|
        DocumentChunk.create!(company: company, document: document, position: chunk[:position],
                              content: chunk[:content], section_ref: chunk[:section_ref],
                              token_count: chunk[:token_count],
                              embedding: Mars::Embedding.embed(chunk[:content]))
      end
      document
    end
  end

  before do
    add_contract_document(vaultline, "VAU-0041")
    add_contract_document(meterpath, "MET-0012")
  end

  let(:token) { issue_token(role: :portco_exec, companies: [ vaultline ]) }

  it "finds the passage that answers the query" do
    post "/api/v1/retrieval/search", params: { query: "annual uplift on each anniversary" }, headers: auth_headers(token)

    expect(response).to have_http_status(:ok)
    expect(json["results"].first["content"]).to include("4.0%")
  end

  it "returns a citation with every hit" do
    post "/api/v1/retrieval/search", params: { query: "annual uplift" }, headers: auth_headers(token)

    hit = json["results"].first
    expect(hit["cite"]).to be_present
    expect(hit).to include("document_title", "section_ref", "position")
  end

  it "returns only chunks the caller is granted, for byte-identical text" do
    post "/api/v1/retrieval/search", params: { query: "annual uplift", limit: 10 }, headers: auth_headers(token)

    expect(json["results"].map { |r| r["company"] }.uniq).to eq([ "vaultline" ])
  end

  # The pattern the corpus forced: every uplift clause is worded identically, so
  # similarity cannot say which contract is in breach. SQL names the contract,
  # then retrieval finds the clause inside it.
  it "scopes to a named document when the caller already knows which one" do
    post "/api/v1/retrieval/search",
         params: { query: "annual uplift", source_ref: "VAU-0041" }, headers: auth_headers(token)

    expect(json["results"]).not_to be_empty
    expect(json["results"].map { |r| r["source_ref"] }.uniq).to eq([ "VAU-0041" ])
  end

  it "returns nothing when scoped to another company's document" do
    post "/api/v1/retrieval/search",
         params: { query: "annual uplift", source_ref: "MET-0012" }, headers: auth_headers(token)

    expect(json["results"]).to be_empty
  end

  it "rejects an empty query rather than ranking noise" do
    post "/api/v1/retrieval/search", params: { query: "   " }, headers: auth_headers(token)

    expect(response).to have_http_status(:unprocessable_content)
    expect(json["error"]).to be_present
  end

  it "caps the number of results a caller can ask for" do
    post "/api/v1/retrieval/search", params: { query: "uplift", limit: 5000 }, headers: auth_headers(token)

    expect(response).to have_http_status(:ok)
    expect(json["results"].size).to be <= Api::V1::RetrievalController::MAX_LIMIT
  end
end
