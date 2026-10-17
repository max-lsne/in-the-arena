module Api
  module V1
    class CompaniesController < BaseController
      def index
        render json: { companies: Company.order(:slug).map { |c| serialize(c) } }
      end

      def show
        render json: { company: serialize(Company.find_by!(slug: params[:slug])) }
      end

      private

      def serialize(company)
        {
          slug: company.slug,
          name: company.name,
          country: company.country,
          vertical: company.vertical,
          currency: company.currency,
          arr_cents: company.arr_cents,
          # Each company counts recurring revenue its own way. Stating the
          # definition alongside the figure is what stops a cross-portfolio
          # comparison from quietly adding incomparable numbers together.
          arr_definition: company.arr_definition,
          acquired_on: company.acquired_on
        }
      end
    end
  end
end
