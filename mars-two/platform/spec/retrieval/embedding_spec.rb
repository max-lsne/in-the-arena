require "rails_helper"

# The default embedder runs offline and deterministically, because the whole
# suite has to pass with no API key and eval baselines have to be comparable
# across runs. It is a hashing embedder: lexical, not semantic. See
# docs/adr/0006-embedding-backends.md for why that is the right default here and
# what it cannot do.
RSpec.describe Mars::Embedding do
  let(:text) { "The Annual Fee shall increase by 4.0% on each anniversary of the Commencement Date." }

  it "returns a vector of the configured dimension" do
    expect(described_class.embed(text).size).to eq(Mars::Embedding::DIMENSIONS)
  end

  it "returns the same vector for the same text" do
    expect(described_class.embed(text)).to eq(described_class.embed(text))
  end

  it "returns a different vector for different text" do
    expect(described_class.embed(text)).not_to eq(described_class.embed("Rooms booked per floor last quarter."))
  end

  it "returns a unit vector, so cosine distance is comparable across chunks" do
    norm = Math.sqrt(described_class.embed(text).sum { |v| v * v })
    expect(norm).to be_within(0.0001).of(1.0)
  end

  it "is unaffected by case and punctuation" do
    expect(described_class.embed("Annual Fee, increase!")).to eq(described_class.embed("annual fee increase"))
  end

  it "returns a zero vector for text with nothing to index" do
    expect(described_class.embed("   ")).to all(eq(0.0))
  end

  it "scores a passage about the query above one that is not" do
    query = described_class.embed("annual uplift percentage on each anniversary")
    near  = described_class.embed("The Annual Fee shall increase by 4.0% on each anniversary of the Commencement Date.")
    far   = described_class.embed("Meeting rooms are released fifteen minutes after a no-show.")

    expect(described_class.cosine(query, near)).to be > described_class.cosine(query, far)
  end
end
