namespace :mars do
  desc "Apply role privileges that a schema dump cannot carry. mars:harden[test]"
  task :harden, [ :env ] => :environment do |_t, args|
    Mars::Harden.apply(args[:env].presence || Rails.env)
  end
end

module Mars
  # pg_dump writes schema, not privileges. Anything expressed as a GRANT or a
  # REVOKE is lost every time a database is rebuilt from structure.sql, and the
  # REVOKE keeping the eval answer key away from the runtime role is exactly
  # that kind of statement.
  #
  # Left unaddressed this produces the worst class of bug: a protection that is
  # present in development, absent in CI, and asserted by a spec that passes in
  # one and fails in the other for reasons unrelated to the code under test.
  module Harden
    STATEMENTS = [
      "GRANT USAGE ON SCHEMA public TO mars_app",
      "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO mars_app",
      "GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO mars_app",
      "REVOKE ALL ON ground_truths FROM mars_app"
    ].freeze

    # Connects to the named environment explicitly rather than using the ambient
    # connection. db:test:prepare runs inside a development process, so hardening
    # the current connection would harden the wrong database and say it worked.
    def self.apply(env)
      config = ActiveRecord::Base.configurations.configs_for(env_name: env.to_s, name: "primary")
      raise ArgumentError, "no primary database configured for #{env}" unless config

      Connector.establish_connection(config.configuration_hash)
      STATEMENTS.each { |sql| Connector.connection.execute(sql) }
      puts "mars:harden applied to #{config.database}"
    ensure
      Connector.connection_pool&.disconnect!
    end

    # ActiveRecord refuses to establish a connection on an anonymous class, so
    # this exists to be named. It connects as the owner role, which is the only
    # role permitted to change grants.
    class Connector < ActiveRecord::Base
      self.abstract_class = true
    end
  end
end

Rake::Task["db:test:prepare"].enhance { Mars::Harden.apply("test") } if Rake::Task.task_defined?("db:test:prepare")

%w[db:migrate db:prepare db:schema:load db:structure:load].each do |name|
  Rake::Task[name].enhance { Mars::Harden.apply(Rails.env) } if Rake::Task.task_defined?(name)
end
