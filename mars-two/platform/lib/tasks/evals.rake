namespace :evals do
  BASELINE_PATH = "db/eval_baselines/detectors.json".freeze

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
  end
end
