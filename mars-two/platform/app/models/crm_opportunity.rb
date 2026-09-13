class CrmOpportunity < TenantRecord
  belongs_to :crm_account
  belongs_to :owner_employee, class_name: "Employee", optional: true

  validates :external_ref, :name, :stage, presence: true
  validates :external_ref, uniqueness: { scope: :company_id }

  scope :open, -> { where.not(stage: %w[closed_won closed_lost]) }
end
