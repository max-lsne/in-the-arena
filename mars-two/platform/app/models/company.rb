class Company < ApplicationRecord
  ARR_DEFINITIONS = %w[contracted_arr annualised_mrr booked_acv].freeze

  has_many :customers, dependent: :destroy
  has_many :employees, dependent: :destroy
  has_many :contracts, dependent: :destroy
  has_many :invoices, dependent: :destroy
  has_many :metric_values, dependent: :destroy
  has_many :documents, dependent: :destroy
  has_many :initiatives, dependent: :destroy
  has_many :grants, dependent: :destroy
  has_many :users, through: :grants

  validates :slug, presence: true, uniqueness: true
  validates :name, :country, :vertical, :currency, presence: true
  validates :arr_cents, numericality: { greater_than_or_equal_to: 0 }
  validates :arr_definition, inclusion: { in: ARR_DEFINITIONS }

  def arr_euros = arr_cents / 100.0
end
