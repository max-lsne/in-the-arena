class DocumentChunk < TenantRecord
  has_neighbors :embedding

  belongs_to :document
  validates :position, :content, presence: true
end
