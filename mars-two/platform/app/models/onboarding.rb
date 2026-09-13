class Onboarding < TenantRecord
  belongs_to :customer
  has_many :onboarding_steps, -> { order(:position) }, dependent: :destroy,
           inverse_of: :onboarding

  validates :started_on, presence: true

  scope :incomplete, -> { where(completed_on: nil) }

  def blocking_step = onboarding_steps.find { |s| s.completed_on.nil? }
end
