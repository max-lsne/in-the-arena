# A number an agent is allowed to state.
#
# Every figure that reaches a model comes from this table, computed in SQL. The
# formula and input count travel with the value so an artefact can show its
# working, and so a grader can check the stated figure against the source rather
# than against a model's recollection of it.
class MetricValue < TenantRecord
  UNITS = %w[eur_cents ratio percent count days].freeze
  GRAINS = %w[month quarter].freeze

  validates :metric_key, :period_start, :period_end, :formula, presence: true
  validates :unit, inclusion: { in: UNITS }
  validates :grain, inclusion: { in: GRAINS }

  scope :for_key, ->(key) { where(metric_key: key) }
  scope :monthly, -> { where(grain: "month") }
  scope :chronological, -> { order(:period_start) }
end
