class InvoiceLine < TenantRecord
  belongs_to :invoice
  validates :description, :quantity, :unit_price_cents, :amount_cents, presence: true
end
