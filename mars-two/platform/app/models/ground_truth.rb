# The answer key written by the synthetic data generator.
#
# Readable only by the owner role, which the eval harness uses. The runtime role
# has no grant on this table at all, so no tool can reach it even by accident.
# See ADR 0004.
class GroundTruth < TenantRecord
  DEFECT_CLASSES = %w[
    revenue_leakage crm_hygiene churn_risk onboarding_stall
  ].freeze

  validates :defect_class, inclusion: { in: DEFECT_CLASSES }
  validates :subject_table, :subject_id, :generator_version, :seed, presence: true
end
