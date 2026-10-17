class ArtefactClaim < TenantRecord
  EVIDENCE_TYPES = %w[metric_value document_chunk record].freeze

  belongs_to :agent_artefact

  validates :statement, presence: true
  validates :evidence_type, inclusion: { in: EVIDENCE_TYPES }

  def evidenced? = evidence_table.present? && evidence_id.present?
end
