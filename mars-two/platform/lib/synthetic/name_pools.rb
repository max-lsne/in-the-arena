module Synthetic
  # Deterministic name material. No faker, because faker's output changes between
  # versions and this data is eval ground truth: the same seed has to produce the
  # same bytes on every machine and in six months.
  module NamePools
    CUSTOMER_PREFIX = {
      "FR" => %w[Banque Groupe Mutuelle Atelier Maison Compagnie Société Caisse],
      "LV" => %w[Baltic Nordic Riga Dzintars Vega Kurzeme Latvijas Aurora],
      "IT" => %w[Gruppo Banca Officina Consorzio Industrie Fratelli Compagnia Studio],
      "NL" => %w[Koninklijke Noord Holland Delta Vandenberg Rijn Zuid Amstel],
      "ES" => %w[Grupo Banco Talleres Hermanos Iberia Costa Casa Unión],
      "GB" => %w[Northern Crown Thames Pennine Harrow Mersey Kingsbridge Ardent],
      "DK" => %w[Nordisk Jysk Kronborg Vestre Skagen Dansk Ålborg Fyn],
      "DE" => %w[Deutsche Rhein Werke Bayerische Hanse Vereinigte Nord Schwaben],
      "SE" => %w[Svenska Norrland Gota Vasa Malmo Bergslagen],
      "BE" => %w[Belgische Meuse Flandre Ardenne],
      "PL" => %w[Polska Wisla Krakowska Baltycka]
    }.freeze

    CUSTOMER_SUFFIX = %w[
      Systems Holdings Group Logistics Energy Health Retail Partners Industries
      Services Works Technologies Capital Foods Transport Media Chemicals
      Engineering Insurance Distribution
    ].freeze

    # Customers are not all domestic. A French vendor sells across Europe, which
    # is what makes currency and tax treatment interesting.
    SPREAD = {
      "FR" => %w[FR FR FR BE ES IT],
      "LV" => %w[LV SE PL DK FI NO],
      "IT" => %w[IT IT ES FR DE],
      "NL" => %w[NL NL BE DE GB],
      "ES" => %w[ES ES PT FR IT],
      "GB" => %w[GB GB IE NL],
      "DK" => %w[DK DK SE NO DE],
      "DE" => %w[DE DE AT CH NL]
    }.freeze

    FIRST_NAMES = %w[
      Amélie Bastien Clara Dieter Elena Florian Gundula Henrik Ingrid Jakub
      Katrin Lorenzo Marta Niels Olga Pieter Quentin Rosa Stefan Tomas
      Ulrike Vincent Wiebke Xavier Yara Zofia Anders Beatriz Cédric Dorota
    ].freeze

    LAST_NAMES = %w[
      Almeida Bergqvist Castellani Dubois Eriksen Fontaine Grigore Hofmann
      Iversen Jankowski Kowalczyk Lindqvist Moreau Nowak Olsen Petrov
      Quintana Rossi Schneider Thijssen Ubeda Varga Weber Ylönen Zanetti
      Bakker Delacroix Ferrari Havel Kaminski
    ].freeze

    TICKET_SUBJECTS = [
      "SSO login loop after tenant migration",
      "Export job times out on large dataset",
      "Invoice totals disagree with portal",
      "Provisioning stuck in pending state",
      "API returns 429 under normal load",
      "Reporting dashboard blank for admins",
      "Licence count not reflecting removals",
      "Webhook deliveries failing silently",
      "Data import rejects valid postcodes",
      "Session timeout too aggressive",
      "Renewal quote missing agreed discount",
      "Audit log gaps during maintenance window"
    ].freeze

    ONBOARDING_STEPS = [
      "Kickoff call",
      "Technical discovery",
      "Tenant provisioned",
      "Identity integration",
      "Data migration",
      "Admin training",
      "Pilot group live",
      "Full rollout signed off"
    ].freeze

    JOB_ROLES = [
      "Account Executive", "Customer Success Manager", "Solutions Engineer",
      "Support Engineer", "Sales Director", "Implementation Consultant"
    ].freeze
  end
end
