class SupportTicket < TenantRecord
  belongs_to :customer
  validates :external_ref, :opened_at, :subject, presence: true
  validates :external_ref, uniqueness: { scope: :company_id }
  scope :open, -> { where(closed_at: nil) }
end
