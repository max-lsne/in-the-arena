class Customer < TenantRecord
  has_many :subscriptions, dependent: :destroy
  has_many :contracts, dependent: :destroy
  has_many :invoices, dependent: :destroy
  has_many :support_tickets, dependent: :destroy
  has_many :usage_dailies, class_name: "UsageDaily", dependent: :delete_all
  has_one  :onboarding, dependent: :destroy
  has_one  :crm_account, dependent: :nullify

  validates :external_ref, :name, presence: true
  validates :external_ref, uniqueness: { scope: :company_id }

  scope :churned, -> { where.not(churned_on: nil) }
  scope :active,  -> { where(churned_on: nil) }
end
