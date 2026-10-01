module Mars
  # The tenant boundary, as seen from Ruby.
  #
  # Postgres enforces isolation through row-level security policies that read a
  # session variable. This module is the only thing that sets it. Everything else
  # in the application queries normally and is filtered underneath.
  #
  # Fails closed: with nothing set, the policies match no rows. A request that
  # forgets to establish tenancy returns empty results rather than everything.
  #
  # See docs/adr/0002-tenancy-and-isolation.md.
  module Tenancy
    SETTING = "mars.company_ids".freeze

    class NotEstablished < StandardError; end

    class << self
      # Run a block with a grant over these companies.
      #
      #   Mars::Tenancy.with(current_user.company_ids) { ... }
      #
      # Restores the previous grant afterwards, so nesting is safe and a pooled
      # connection is never handed back carrying someone else's scope.
      def with(company_ids)
        previous = raw_setting
        assign(normalise(company_ids))
        yield
      ensure
        write(previous.to_s)
      end

      # Drop all tenancy. Subsequent queries see nothing.
      def clear
        write("")
      end

      def current_company_ids
        raw_setting.to_s.split(",").reject(&:empty?).map(&:to_i)
      end

      def established?
        current_company_ids.any?
      end

      def require_established!
        raise NotEstablished, "no tenant grant is set on this connection" unless established?
      end

      private

      def normalise(company_ids)
        Array(company_ids).flatten.compact.map { |c| c.respond_to?(:id) ? c.id : c }.map do |id|
          Integer(id)
        rescue ArgumentError, TypeError
          raise ArgumentError, "company id must be an integer, got #{id.inspect}"
        end.uniq.sort
      end

      def assign(ids) = write(ids.join(","))

      def write(value)
        connection.execute(
          "SELECT set_config(#{connection.quote(SETTING)}, #{connection.quote(value)}, false)"
        )
      end

      def raw_setting
        connection.select_value(
          "SELECT current_setting(#{connection.quote(SETTING)}, true)"
        )
      end

      def connection = ApplicationRecord.connection
    end
  end
end
