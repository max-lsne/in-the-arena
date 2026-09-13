class UsageDaily < TenantRecord
  self.table_name = "usage_daily"
  belongs_to :customer
  validates :on_date, :metric_key, :value, presence: true
end
