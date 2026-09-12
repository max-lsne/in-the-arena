module Api
  module V1
    # Authenticates the caller and pushes their grant into the Postgres session
    # for the duration of the request.
    #
    # This is the only place tenancy is decided. Below it, controllers and models
    # query normally and the database filters them, so a missing scope is an
    # empty result rather than a leak. See docs/adr/0002-tenancy-and-isolation.md.
    class BaseController < ActionController::API
      class Unauthorized < StandardError; end
      class InvalidRequest < StandardError; end

      around_action :within_caller_grant

      rescue_from Unauthorized, with: :render_unauthorized
      rescue_from InvalidRequest, with: :render_invalid
      rescue_from ActiveRecord::RecordNotFound, with: :render_not_found

      private

      attr_reader :current_user

      def within_caller_grant
        @current_user = authenticate!

        # Mars::Tenancy.with restores the previous value in an ensure block, so a
        # pooled connection is never handed on carrying this request's grant,
        # including when the action raises.
        Mars::Tenancy.with(@current_user.granted_company_ids) { yield }
      rescue Unauthorized => e
        render_unauthorized(e)
      end

      def authenticate!
        token = ApiToken.authenticate(bearer_token)
        raise Unauthorized, "invalid or missing API token" unless token

        # api_tokens carries no policy, so the runtime role writes it directly.
        # The first version of this reached for the owner role here, which the
        # coverage spec rejected: the bypass was not needed, and an unnecessary
        # privilege in the authentication path is the last place to leave one.
        token.update_column(:last_used_at, Time.current)
        token.user
      end

      def bearer_token
        header = request.headers["Authorization"].to_s
        header.start_with?("Bearer ") ? header.delete_prefix("Bearer ").strip : nil
      end

      # Looked up through the policy, so a company outside the caller's grant is
      # simply not there. The caller learns nothing about whether it exists.
      def company_from_params!(param = :company)
        slug = params[param].to_s
        raise InvalidRequest, "company is required" if slug.blank?

        Company.find_by!(slug: slug)
      end

      def render_unauthorized(error)
        render json: { error: error.message }, status: :unauthorized
      end

      def render_invalid(error)
        render json: { error: error.message }, status: :unprocessable_content
      end

      def render_not_found(_error)
        render json: { error: "not found" }, status: :not_found
      end
    end
  end
end
