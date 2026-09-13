class Grant < ApplicationRecord
  belongs_to :user
  belongs_to :company
  validates :company_id, uniqueness: { scope: :user_id }
end
