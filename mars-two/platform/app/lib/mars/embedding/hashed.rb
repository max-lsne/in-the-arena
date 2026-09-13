require "digest"

module Mars
  module Embedding
    # A hashing embedder. No model, no network, no state.
    #
    # Tokens are lowercase words plus word bigrams. Each token is hashed once;
    # the low bits pick a dimension and the high bit picks a sign, so unrelated
    # tokens that collide tend to cancel rather than compound. Term frequency is
    # sublinear, because a clause that says "fee" eight times is not eight times
    # more about fees. The result is L2-normalised so cosine distance is
    # comparable across chunks of different lengths.
    #
    # Lexical, not semantic. It finds the clause that uses the query's words. It
    # does not find the clause that means the same thing in other words.
    module Hashed
      NAME = "hashed-v1".freeze

      class << self
        def embed(text)
          counts = term_frequencies(text)
          return Array.new(DIMENSIONS, 0.0) if counts.empty?

          vector = Array.new(DIMENSIONS, 0.0)
          counts.each do |token, count|
            hash = digest(token)
            vector[hash % DIMENSIONS] += sign(hash) * (1 + Math.log(count))
          end
          normalise(vector)
        end

        private

        def term_frequencies(text)
          words = text.downcase.scan(/[a-z0-9]+/)
          return {} if words.empty?

          bigrams = words.each_cons(2).map { |a, b| "#{a} #{b}" }
          (words + bigrams).tally
        end

        # One hash per token. Taking the dimension from the low bits and the sign
        # from the high bit keeps the two choices independent without hashing
        # twice.
        def digest(token) = Digest::SHA256.digest(token).unpack1("Q>")

        def sign(hash) = hash.anybits?(1 << 63) ? -1.0 : 1.0

        def normalise(vector)
          norm = Math.sqrt(vector.sum { |v| v * v })
          return vector if norm.zero?

          vector.map { |v| v / norm }
        end
      end
    end
  end
end
