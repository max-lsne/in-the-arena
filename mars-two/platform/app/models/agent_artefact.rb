class AgentArtefact < ApplicationRecord
  belongs_to :agent_run
  has_many :artefact_claims, dependent: :destroy

  validates :kind, :title, presence: true

  # An artefact whose claims cannot name their evidence is not shown. The check
  # lives here rather than in a prompt because behaviour that must happen every
  # time cannot depend on a model choosing to do it.
  def evidenced? = artefact_claims.any? && artefact_claims.all?(&:evidenced?)
end
