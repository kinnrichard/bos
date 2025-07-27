class Api::V1::ZeroTokensController < Api::V1::BaseController
  # Skip authentication for Zero token endpoint in development
  skip_before_action :authenticate_request, only: [ :create ]

  def create
    # Since we skip authenticate_request, manually resolve user from cookies
    user = resolve_user_from_cookies

    if user
      token = ZeroJwt.generate(user_id: user.id)
      render json: {
        token: token,
        user_id: user.id.to_s  # Zero needs string user ID
      }, status: :ok
    else
      # No user authenticated - return unauthorized
      render json: { error: "Authentication required" }, status: :unauthorized
    end
  end

  private

  def resolve_user_from_cookies
    # Get user from signed cookies in the HTTP request
    user_id = cookies.signed[:user_id]
    token = cookies.signed[:auth_token]

    # Debug logging for troubleshooting
    if Rails.env.test?
      Rails.logger.info "ZERO RESOLVE DEBUG: user_id cookie: #{user_id}"
      Rails.logger.info "ZERO RESOLVE DEBUG: auth_token present: #{token.present?}"
    end

    if user_id.present? && token.present?
      user = User.find_by(id: user_id)
      Rails.logger.info "ZERO RESOLVE DEBUG: Found user: #{user&.name}" if Rails.env.test?
      user
    else
      Rails.logger.info "ZERO RESOLVE DEBUG: No user found - missing cookies" if Rails.env.test?
      nil
    end
  end
end
