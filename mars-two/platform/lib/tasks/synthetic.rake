namespace :synthetic do
  desc "Generate the synthetic portfolio. SEED=20260912 to override"
  task seed: :environment do
    require Rails.root.join("lib/synthetic/generator")

    seed = ENV.fetch("SEED", Synthetic::Generator::DEFAULT_SEED).to_i
    started = Time.current
    counts = Synthetic::Generator.new(seed: seed).run!
    elapsed = (Time.current - started).round(1)

    puts "seeded in #{elapsed}s with seed #{seed}"
    counts.sort_by { |k, _| k.to_s }.each { |table, n| puts format("  %-18s %8d", table, n) }

    ApplicationRecord.as_owner do
      total = Company.sum(:arr_cents)
      puts format("  %-18s %8s", "headline ARR", "EUR #{(total / 100.0 / 1_000_000).round(1)}M")
      puts format("  %-18s %8d", "ground truths", GroundTruth.count)
      GroundTruth.group(:defect_class).count.sort.each { |k, v| puts format("    %-16s %6d", k, v) }
    end
  end

  desc "Print the planted answer key. Never exposed through the API"
  task truth: :environment do
    ApplicationRecord.as_owner do
      GroundTruth.includes(:company).order(:company_id, :defect_class, :id).find_each do |gt|
        puts format("%-12s %-18s %-28s %s", gt.company.slug, gt.defect_class,
                    gt.expected["kind"], gt.expected.except("kind").to_json)
      end
    end
  end
end
