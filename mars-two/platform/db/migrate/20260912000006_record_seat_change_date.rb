class RecordSeatChangeDate < ActiveRecord::Migration[8.1]
  def change
    # Reconciliation has to work from the record, not from knowledge of how the
    # data was made. Without the date seats changed, the unbilled amount is not
    # derivable from contract terms and invoices alone, and the grader could only
    # check that the right contract was named rather than the right figure.
    #
    # A real billing system records this for the same reason.
    add_column :subscriptions, :seats_changed_on, :date
  end
end
