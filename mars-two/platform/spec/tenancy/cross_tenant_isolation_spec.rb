require "rails_helper"

# A gate that is never attacked is not known to work. These specs authenticate as
# a user granted one company and then try, through every route available, to read
# another company's rows.
RSpec.describe "Cross-tenant isolation", type: :model do
  let!(:vaultline) { seeding { Company.create!(slug: "vaultline", name: "Vaultline", country: "FR", vertical: "access_security", arr_cents: 12_000_000_00, currency: "EUR") } }
  let!(:meterpath) { seeding { Company.create!(slug: "meterpath", name: "Meterpath", country: "LV", vertical: "marketplace_billing", arr_cents: 14_500_000_00, currency: "EUR") } }

  let!(:vaultline_customer) { seeding { Customer.create!(company: vaultline, external_ref: "V-1", name: "Banque Alpine", country: "FR") } }
  let!(:meterpath_customer) { seeding { Customer.create!(company: meterpath, external_ref: "M-1", name: "Nordic Cloud Distributors", country: "SE") } }

  describe "with a grant over one company" do
    it "sees only that company's customers" do
      as_user_of(vaultline) do
        expect(Customer.pluck(:name)).to eq([ "Banque Alpine" ])
      end
    end

    it "cannot load another company's customer by primary key" do
      as_user_of(vaultline) do
        expect { Customer.find(meterpath_customer.id) }.to raise_error(ActiveRecord::RecordNotFound)
      end
    end

    it "cannot reach another company's rows through raw SQL" do
      as_user_of(vaultline) do
        count = ApplicationRecord.connection.select_value(
          "SELECT count(*) FROM customers WHERE company_id = #{meterpath.id}"
        )
        expect(count).to eq(0)
      end
    end

    it "cannot reach another company's rows by unscoping" do
      as_user_of(vaultline) do
        expect(Customer.unscoped.count).to eq(1)
      end
    end

    it "sees only that company in the company directory" do
      as_user_of(vaultline) do
        expect(Company.pluck(:slug)).to eq([ "vaultline" ])
      end
    end

    # Two layers, tested separately on purpose. The first version of this spec
    # asserted only that the write raised, and it passed because the belongs_to
    # validation fired first. That proves application code is careful; it proves
    # nothing about the database. Careful application code is exactly what fails
    # the day someone writes a bulk insert.
    it "is stopped by application validation, because the company is not visible" do
      as_user_of(vaultline) do
        expect {
          Customer.create!(company_id: meterpath.id, external_ref: "M-2", name: "Injected", country: "SE")
        }.to raise_error(ActiveRecord::RecordInvalid, /Company must exist/)
      end
    end

    it "is stopped by the database even when validations are skipped" do
      as_user_of(vaultline) do
        record = Customer.new(company_id: meterpath.id, external_ref: "M-3", name: "Injected", country: "SE")

        expect { record.save(validate: false) }
          .to raise_error(ActiveRecord::StatementInvalid, /row-level security/i)
      end
    end

    it "is stopped by the database on a bulk insert that touches no model" do
      as_user_of(vaultline) do
        expect {
          ApplicationRecord.connection.execute(<<~SQL)
            INSERT INTO customers (company_id, external_ref, name, country, created_at, updated_at)
            VALUES (#{meterpath.id}, 'M-4', 'Injected', 'SE', now(), now())
          SQL
        }.to raise_error(ActiveRecord::StatementInvalid, /row-level security/i)
      end
    end
  end

  describe "with a grant over the whole group" do
    it "sees every company" do
      as_user_of(vaultline, meterpath) do
        expect(Company.pluck(:slug).sort).to eq(%w[meterpath vaultline])
        expect(Customer.count).to eq(2)
      end
    end
  end

  describe "with no tenancy set" do
    it "fails closed rather than open" do
      Mars::Tenancy.clear
      expect(Customer.count).to eq(0)
      expect(Company.count).to eq(0)
    end
  end

  describe "the planted answer key" do
    it "is unreachable by the runtime role" do
      expect {
        ApplicationRecord.connection.select_value("SELECT count(*) FROM ground_truths")
      }.to raise_error(ActiveRecord::StatementInvalid, /permission denied/i)
    end
  end
end
