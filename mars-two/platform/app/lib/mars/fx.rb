module Mars
  # Fixed conversion rates.
  #
  # A rate table rather than a live feed, because reconciliation has to be
  # reproducible: the same contract checked twice must produce the same figure,
  # and an eval baseline recorded last week must still compare. Real
  # reconciliation reads a dated rate; the lesson here is that the expected
  # answer must be computable, not that currency conversion is simple.
  module Fx
    BASE = "EUR".freeze

    TO_EUR = {
      "EUR" => 1.0,
      "GBP" => 1.17,
      "USD" => 0.92,
      "SEK" => 0.087,
      "DKK" => 0.134,
      "PLN" => 0.23
    }.freeze

    class UnknownCurrency < StandardError; end

    def self.rate(currency)
      TO_EUR.fetch(currency.to_s.upcase) { raise UnknownCurrency, "no rate for #{currency}" }
    end

    # What an amount billed in `currency` is actually worth in the contract's
    # currency. Billing GBP at face value against a EUR contract under-collects
    # by the difference.
    def self.to_eur_cents(amount_cents, currency)
      (amount_cents * rate(currency)).round
    end
  end
end
