module Mars
  # Turns text into a vector for similarity search.
  #
  # The default backend runs offline and deterministically. See
  # docs/adr/0006-embedding-backends.md for why, and for what it cannot do.
  module Embedding
    DIMENSIONS = 1024

    class UnknownBackend < StandardError; end

    class << self
      def backend
        @backend ||= resolve(ENV.fetch("MARS_EMBEDDING", "hashed"))
      end

      # Chunks record the backend that embedded them, so a swapped backend is an
      # error rather than a silently degraded search.
      def backend_name = backend::NAME

      def embed(text) = backend.embed(text.to_s)

      def cosine(left, right)
        dot = 0.0
        left_norm = 0.0
        right_norm = 0.0
        left.each_with_index do |value, i|
          dot += value * right[i]
          left_norm += value * value
          right_norm += right[i] * right[i]
        end
        return 0.0 if left_norm.zero? || right_norm.zero?

        dot / (Math.sqrt(left_norm) * Math.sqrt(right_norm))
      end

      def reset! = @backend = nil

      private

      def resolve(name)
        case name
        when "hashed" then Hashed
        else raise UnknownBackend, "unknown MARS_EMBEDDING backend #{name.inspect}"
        end
      end
    end
  end
end
