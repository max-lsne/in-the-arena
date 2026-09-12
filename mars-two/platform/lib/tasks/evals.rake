namespace :evals do
  BASELINE_PATH = "db/eval_baselines/detectors.json".freeze
  CASES_PATH = "db/eval_baselines/cases.json".freeze

  desc "Score every model-free detector against the planted answer key"
  task detectors: :environment do
    require Rails.root.join("lib/synthetic/generator")

    scores = ApplicationRecord.as_owner { Evals::DetectorScores.call }
    puts Evals::Report.render(scores)

    path = Rails.root.join(BASELINE_PATH)
    if path.exist?
      drift = Evals::Report.compare(JSON.parse(path.read), scores)
      puts
      puts drift.empty? ? "no drift against the committed baseline" : Evals::Report.render_drift(drift)
      abort "eval regression against #{BASELINE_PATH}" if drift.any? { |d| d[:worse] } && ENV["MARS_EVAL_GATE"] != "off"
    else
      puts "\nno baseline yet. Record one with: bin/rails evals:record"
    end
  end

  desc "Record the current scores as the committed baseline"
  task record: :environment do
    require Rails.root.join("lib/synthetic/generator")

    scores = ApplicationRecord.as_owner { Evals::DetectorScores.call }
    path = Rails.root.join(BASELINE_PATH)
    path.dirname.mkpath
    path.write("#{JSON.pretty_generate(scores)}\n")

    puts Evals::Report.render(scores)
    puts "\nwrote #{BASELINE_PATH}"
    Rake::Task["evals:cases"].invoke
  end

  desc "Write the per-case ledger the error analysis view reads"
  task cases: :environment do
    require Rails.root.join("lib/synthetic/generator")

    # Through the owner role, because the ledger compares against the answer key
    # and the runtime role has no grant on it. This is the only place that
    # comparison happens, and it happens at build time, not per request.
    ledger = ApplicationRecord.as_owner { Evals::CaseLedger.call }
    path = Rails.root.join(CASES_PATH)
    path.dirname.mkpath
    path.write("#{JSON.pretty_generate(ledger)}\n")

    by_verdict = ledger[:cases].group_by { |c| c[:verdict] }.transform_values(&:size).sort_by { |_, n| -n }
    puts "\nwrote #{CASES_PATH}: #{ledger[:cases].size} cases, #{by_verdict.map { |v, n| "#{n} #{v}" }.join(', ')}"
  end
end
