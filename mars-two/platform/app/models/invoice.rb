class Invoice < TenantRecord
  belongs_to :customer
  belongs_to :contract, optional: true
  has_many :invoice_lines, dependent: :destroy

  validates :number, :issued_on, :period_start, :period_end, :currency, presence: true
  validates :number, uniqueness: { scope: :company_id }
end
