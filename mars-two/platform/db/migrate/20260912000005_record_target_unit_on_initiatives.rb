class RecordTargetUnitOnInitiatives < ActiveRecord::Migration[8.1]
  def change
    # An initiative's baseline and target are numbers in some unit, and until now
    # nothing said which. A retention target of "50" compared against a measured
    # ratio of 1.027 yields a progress figure of 4.6, which looks like a fact and
    # is nonsense.
    #
    # Recording the unit lets the mismatch be detected instead of rendered.
    add_column :initiatives, :target_unit, :string
  end
end
