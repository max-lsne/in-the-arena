class CrmAccount < TenantRecord
  belongs_to :customer, optional: true
  belongs_to :owner_employee, class_name: "Employee", optional: true
  has_many :crm_opportunities, dependent: :destroy

  validates :external_ref, :name, presence: true
  validates :external_ref, uniqueness: { scope: :company_id }
end
