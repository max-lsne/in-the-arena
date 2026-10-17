class Initiative < TenantRecord
  belongs_to :owner_employee, class_name: "Employee", optional: true
  validates :title, :status, presence: true
end
