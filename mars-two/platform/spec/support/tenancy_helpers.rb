module TenancyHelpers
  # Create records across tenants for test setup. Uses the owner role, because
  # setting up a cross-tenant scenario is exactly the case the runtime role is
  # forbidden from doing.
  def seeding(&block)
    ApplicationRecord.as_owner(&block)
  end

  # Run assertions as a user whose grant covers these companies.
  def as_user_of(*companies, &block)
    Mars::Tenancy.with(Array(companies).flatten.map { |c| c.respond_to?(:id) ? c.id : c }, &block)
  end
end

RSpec.configure do |config|
  config.include TenancyHelpers
end
