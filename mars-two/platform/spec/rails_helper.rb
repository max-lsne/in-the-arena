require "spec_helper"
ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"

abort("The Rails environment is running in production mode!") if Rails.env.production?
require "rspec/rails"

Dir[Rails.root.join("spec/support/**/*.rb")].sort.each { |f| require f }

begin
  ActiveRecord::Migration.maintain_test_schema!
rescue ActiveRecord::PendingMigrationError => e
  abort e.to_s.strip
end

RSpec.configure do |config|
  # For asserting that scored code does not read the clock.
  config.include ActiveSupport::Testing::TimeHelpers

  config.fixture_paths = [ Rails.root.join("spec/fixtures") ]

  # Transactional fixtures are off deliberately. Tests write through the owner
  # connection and read through the application connection, and those are two
  # separate Postgres sessions against one database. An uncommitted write on one
  # is invisible to the other, so wrapping each example in a transaction would
  # make every isolation spec pass for the wrong reason.
  config.use_transactional_fixtures = false

  # Specs tagged :seeded build the whole synthetic portfolio themselves and are
  # slow, so the per-example truncation is skipped for them. They are responsible
  # for their own state, and the generator truncates before it writes anyway.
  config.before(:each) do |example|
    Mars::Tenancy.clear
    next if example.metadata[:seeded]

    ApplicationRecord.as_owner do
      tables = ApplicationRecord.connection.tables - %w[schema_migrations ar_internal_metadata]
      next if tables.empty?

      ApplicationRecord.connection.execute(
        "TRUNCATE #{tables.map { |t| %("#{t}") }.join(', ')} RESTART IDENTITY CASCADE"
      )
    end
  end

  config.after(:each) { Mars::Tenancy.clear }

  config.infer_spec_type_from_file_location!
  config.filter_rails_from_backtrace!
end
