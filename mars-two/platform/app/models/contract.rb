class Contract < TenantRecord
  belongs_to :customer
  has_many :invoices, dependent: :nullify

  validates :reference, :signed_on, :starts_on, :currency, presence: true
  validates :reference, uniqueness: { scope: :company_id }

  # Terms the reconciliation agent checks against what was actually billed.
  def uplift_pct = terms["uplift_pct"]
  def seat_commitment = terms["seat_commitment"]
  def discount_pct = terms["discount_pct"]
  def discount_expires_on = terms["discount_expires_on"]&.then { |d| Date.parse(d) }
end
