class OnboardingStep < TenantRecord
  belongs_to :onboarding
  validates :name, :position, presence: true
end
