module ApiHelpers
  # Creates a user, their grants and a token. Returns the raw token, which is the
  # only moment it exists in plaintext; the database stores only its digest.
  def issue_token(role:, companies:, email: nil)
    raw = "mars_#{SecureRandom.hex(16)}"
    ApplicationRecord.as_owner do
      user = User.create!(
        email: email || "#{role}-#{SecureRandom.hex(4)}@example.test",
        name: role.to_s.tr("_", " ").titleize, role: role.to_s
      )
      Array(companies).each { |c| Grant.create!(user: user, company: c) }
      ApiToken.create!(user: user, name: "spec", token_digest: ApiToken.digest(raw))
    end
    raw
  end

  def auth_headers(token) = { "Authorization" => "Bearer #{token}", "Accept" => "application/json" }

  def json = JSON.parse(response.body)
end

RSpec.configure { |config| config.include ApiHelpers, type: :request }
