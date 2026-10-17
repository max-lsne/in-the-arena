class EnableExtensionsAndTenancy < ActiveRecord::Migration[8.1]
  def up
    enable_extension "vector" unless extension_enabled?("vector")

    # Reads the grant off the session and returns it as an array of company ids.
    #
    # An unset or empty setting yields an empty array, so every policy that uses
    # it matches no rows. That is the fail-closed behaviour: forgetting to
    # establish tenancy returns nothing rather than everything.
    #
    # STABLE rather than VOLATILE so the planner calls it once per query rather
    # than once per row.
    execute <<~SQL
      CREATE OR REPLACE FUNCTION mars_company_ids() RETURNS bigint[]
      LANGUAGE sql STABLE
      AS $$
        SELECT CASE
          WHEN coalesce(current_setting('mars.company_ids', true), '') = ''
            THEN ARRAY[]::bigint[]
          ELSE string_to_array(current_setting('mars.company_ids', true), ',')::bigint[]
        END
      $$;
    SQL
  end

  def down
    execute "DROP FUNCTION IF EXISTS mars_company_ids();"
  end
end
