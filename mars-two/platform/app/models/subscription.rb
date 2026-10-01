class Subscription < TenantRecord
  belongs_to :customer
  validates :plan, :currency, :started_on, :status, presence: true
  scope :active, -> { where(status: "active") }
end
