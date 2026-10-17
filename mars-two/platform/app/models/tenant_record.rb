# Base class for anything owned by a single portfolio company.
#
# The company association is declared here rather than repeated on every model,
# and so is the rule that company_id is required. Postgres enforces isolation
# regardless; this exists so a missing company_id fails as a validation error at
# the point of the mistake rather than as a policy violation later.
class TenantRecord < ApplicationRecord
  self.abstract_class = true

  def self.inherited(subclass)
    super
    subclass.belongs_to :company
    subclass.validates :company_id, presence: true
  end
end
