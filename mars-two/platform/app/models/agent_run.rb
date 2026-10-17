class AgentRun < ApplicationRecord
  has_many :agent_artefacts, dependent: :destroy

  validates :agent_key, :status, :started_at, presence: true
  validates :scope_company_ids, presence: true

  scope :for_agent, ->(key) { where(agent_key: key) }
end
