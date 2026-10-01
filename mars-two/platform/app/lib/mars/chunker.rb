module Mars
  # Splits a document into retrievable pieces.
  #
  # Chunking is where retrieval quality mostly lives, and the decision here is
  # to follow the document's own structure rather than a fixed window. Contracts
  # and board minutes are already divided into numbered sections by their
  # authors, and those divisions are better than any boundary a sliding window
  # would invent. A clause split down the middle cannot be cited.
  #
  # The section reference travels with the chunk, so an agent quoting a clause
  # can say which clause it was.
  module Chunker
    MAX_CHARS = 1200
    SECTION = /\A\s*(\d+(?:\.\d+)*)[.)]?\s+\S/

    class << self
      def call(text)
        blocks = String(text).split(/\n\s*\n/).map(&:strip).reject(&:empty?)

        blocks
          .flat_map { |block| split_to_size(block).map { |part| { content: part, section_ref: section_ref(block) } } }
          .each_with_index
          .map { |chunk, i| chunk.merge(position: i + 1, token_count: chunk[:content].split(/\s+/).size) }
      end

      private

      def section_ref(block) = block[SECTION, 1]

      # Blocks that fit are left whole. Oversized ones are divided on sentence
      # boundaries, and a single sentence longer than the bound is cut on
      # whitespace rather than mid-word.
      def split_to_size(block)
        return [ block ] if block.length <= MAX_CHARS

        parts = []
        current = +""
        sentences(block).each do |sentence|
          if current.empty?
            current << sentence
          elsif current.length + 1 + sentence.length <= MAX_CHARS
            current << " " << sentence
          else
            parts << current
            current = +sentence.dup
          end
        end
        parts << current unless current.empty?
        parts.flat_map { |part| part.length <= MAX_CHARS ? [ part ] : hard_split(part) }
      end

      def sentences(block) = block.split(/(?<=[.!?])\s+/).reject(&:empty?)

      def hard_split(part)
        words = part.split(/\s+/)
        parts = []
        current = +""
        words.each do |word|
          if current.empty?
            current << word
          elsif current.length + 1 + word.length <= MAX_CHARS
            current << " " << word
          else
            parts << current
            current = +word.dup
          end
        end
        parts << current unless current.empty?
        parts
      end
    end
  end
end
