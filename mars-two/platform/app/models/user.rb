class User < ApplicationRecord
  ROLES = %w[group_operator portco_exec fde].freeze

  has_many :grants, dependent: :destroy
  has_many :companies, through: :grants
  has_many :api_tokens, dependent: :destroy

  validates :email, presence: true, uniqueness: true
  validates :name, presence: true
  validates :role, inclusion: { in: ROLES }

  # The grant this user's requests run under. Read once per request and written
  # to the Postgres session, after which the database does the filtering.
  def granted_company_ids = grants.pluck(:company_id)
end
