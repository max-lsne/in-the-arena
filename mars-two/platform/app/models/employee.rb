class Employee < TenantRecord
  has_many :owned_crm_accounts, class_name: "CrmAccount", foreign_key: :owner_employee_id,
           dependent: :nullify, inverse_of: :owner_employee
  has_many :owned_opportunities, class_name: "CrmOpportunity", foreign_key: :owner_employee_id,
           dependent: :nullify, inverse_of: :owner_employee

  validates :name, presence: true

  scope :departed, -> { where.not(left_on: nil) }
  scope :current, -> { where(left_on: nil) }
end
