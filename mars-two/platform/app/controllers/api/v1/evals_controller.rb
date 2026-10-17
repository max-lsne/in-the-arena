module Api
  module V1
    # The per-case eval ledger, for the error analysis view.
    #
    # Read from the committed build artefact rather than computed here. Scoring a
    # detector means comparing it against the answer key, and the answer key is
    # deliberately unreadable to the runtime role: granting it to a web request
    # would put the thing every tool is kept away from one controller bug away
    # from a tool. The ledger is written by `bin/rails evals:record`, reviewed in
    # a diff, and served read-only.
    #
    # The file is not tenant data, so nothing filters it. Rows are filtered here
    # instead, against the companies the caller's grant actually returns.
    class EvalsController < BaseController
      LEDGER_PATH = "db/eval_baselines/cases.json".freeze

      def cases
        ledger = read_ledger
        return render(json: { error: "no eval ledger has been recorded" }, status: :not_found) if ledger.nil?

        visible = ledger.fetch("cases", []).select { |row| granted_slugs.include?(row["company"]) }
        visible = visible.select { |row| row["detector"] == params[:detector] } if params[:detector].present?

        render json: ledger.merge(
          "cases" => visible,
          "verdicts" => visible.group_by { |row| row["verdict"] }.transform_values(&:size)
        )
      end

      private

      # Through the policy, so this is the caller's grant as Postgres sees it
      # rather than a second copy of the rule that could disagree with it.
      def granted_slugs = @granted_slugs ||= Company.pluck(:slug).to_set

      def read_ledger
        path = Rails.root.join(LEDGER_PATH)
        return nil unless path.exist?

        JSON.parse(path.read)
      end
    end
  end
end
