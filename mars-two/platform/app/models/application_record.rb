# Base class for every model.
#
# Models connect as `mars_app`, which has neither SUPERUSER nor BYPASSRLS, so
# Postgres row-level security filters everything they read and write. The owner
# role is reachable only through an explicit block, which keeps the bypass
# greppable rather than ambient. See docs/adr/0002-tenancy-and-isolation.md.
class ApplicationRecord < ActiveRecord::Base
  primary_abstract_class

  connects_to database: { writing: :app, reading: :app, owner: :primary }

  # Run a block against the owner role, bypassing row-level security.
  #
  # Legitimate uses are migrations, seeding and the eval harness reading planted
  # ground truth. Anything else is almost certainly a scoping bug being worked
  # around. There is a spec asserting this appears nowhere in app/ outside this
  # file.
  def self.as_owner(&block)
    connected_to(role: :owner, &block)
  end
end
