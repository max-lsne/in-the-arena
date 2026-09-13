require "digest"

class ApiToken < ApplicationRecord
  belongs_to :user
  validates :name, :token_digest, presence: true

  def self.digest(raw) = Digest::SHA256.hexdigest(raw)

  def self.authenticate(raw)
    return nil if raw.blank?

    find_by(token_digest: digest(raw))
  end
end
