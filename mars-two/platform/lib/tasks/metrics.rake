namespace :metrics do
  desc "Compute monthly rollups for every company. MONTHS=12 to override"
  task rollup: :environment do
    require Rails.root.join("app/lib/metrics/rollup") unless defined?(Metrics::Rollup)

    months = ENV.fetch("MONTHS", 12).to_i
    written = 0

    ApplicationRecord.as_owner do
      Company.order(:slug).find_each do |company|
        written += Metrics::Rollup.call(company: company, months: months)
      end
    end

    puts "wrote #{written} metric values across #{months} months"
  end

  desc "Print the latest month of every metric, by company"
  task show: :environment do
    ApplicationRecord.as_owner do
      Company.order(:slug).find_each do |company|
        latest = MetricValue.where(company_id: company.id).maximum(:period_start)
        next puts("#{company.slug}: no metrics") unless latest

        values = MetricValue.where(company_id: company.id, period_start: latest).order(:metric_key)
        puts "#{company.name} (#{company.slug}), #{latest.strftime('%B %Y')}"
        values.each do |v|
          shown = case v.unit
          when "eur_cents" then "EUR #{ActiveSupport::NumberHelper.number_to_delimited((v.value / 100).to_i)}"
          when "ratio" then "#{(v.value * 100).round(1)}%"
          else v.value.to_f.round(1).to_s
          end
          puts format("  %-24s %14s  (n=%d)", v.metric_key, shown, v.input_count)
        end
        puts
      end
    end
  end
end
