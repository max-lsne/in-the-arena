class Document < TenantRecord
  KINDS = %w[contract board_minutes support_transcript].freeze

  has_many :document_chunks, -> { order(:position) }, dependent: :destroy,
           inverse_of: :document

  validates :title, :body, presence: true
  validates :kind, inclusion: { in: KINDS }
end
