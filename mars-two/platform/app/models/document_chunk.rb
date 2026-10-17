class DocumentChunk < TenantRecord
  has_neighbors :embedding

  belongs_to :document
  validates :position, :content, presence: true
  validates :embedding_backend, presence: true, if: -> { embedding.present? }

  # Stamping the backend is not left to the caller. Behaviour that must happen
  # every time cannot depend on whoever writes the next ingestion path
  # remembering it, so assigning an embedding records which embedder produced it.
  def embedding=(value)
    super
    self.embedding_backend = value.nil? ? nil : Mars::Embedding.backend_name
  end

  # Nearest chunks by cosine distance.
  #
  # Row-level security applies to this query like any other, which is the reason
  # ADR 0005 keeps retrieval in this service rather than in the Python one. A
  # caller granted one company cannot retrieve another company\'s contract text,
  # and that holds without any filtering logic in the agent layer.
  #
  # Chunks embedded by a different backend are excluded rather than ranked,
  # because vectors from two embedders are not comparable and mixing them returns
  # plausible nonsense instead of an error.
  scope :nearest_to, lambda { |embedding, limit: 5|
    where(embedding_backend: Mars::Embedding.backend_name)
      .nearest_neighbors(:embedding, embedding, distance: "cosine")
      .limit(limit)
  }

  def cite = "#{document.title}#{section_ref.present? ? " s.#{section_ref}" : ""}"
end
