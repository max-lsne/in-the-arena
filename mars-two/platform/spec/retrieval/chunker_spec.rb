require "rails_helper"

RSpec.describe Mars::Chunker do
  let(:contract) do
    <<~TEXT
      1. Term
      This Agreement commences on 1 March 2024 and continues for two years.

      2. Fees
      The Annual Fee is EUR 120,000, payable monthly in arrears.

      4.2 Uplift
      The Annual Fee shall increase by 4.0% on each anniversary of the Commencement Date.
    TEXT
  end

  it "splits a document into chunks" do
    expect(described_class.call(contract).size).to be > 1
  end

  it "keeps the section reference with the chunk it came from" do
    uplift = described_class.call(contract).find { |c| c[:content].include?("4.0%") }
    expect(uplift[:section_ref]).to eq("4.2")
  end

  it "numbers chunks from one, in document order" do
    expect(described_class.call(contract).map { |c| c[:position] }).to eq((1..described_class.call(contract).size).to_a)
  end

  it "keeps every chunk under the size bound" do
    long = (["The Annual Fee is payable monthly in arrears."] * 400).join(" ")
    expect(described_class.call(long).map { |c| c[:content].length }).to all(be <= Mars::Chunker::MAX_CHARS)
  end

  it "loses no text" do
    rejoined = described_class.call(contract).map { |c| c[:content] }.join(" ")
    expect(rejoined).to include("4.0%")
    expect(rejoined).to include("EUR 120,000")
    expect(rejoined).to include("1 March 2024")
  end

  it "returns nothing for an empty document" do
    expect(described_class.call("")).to be_empty
  end
end
