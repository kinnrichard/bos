module Authenticatable
  extend ActiveSupport::Concern

  included do
    before_action :authenticate_request
  end

  private

  def authenticate_request
    @current_user = current_user_from_token
    render_unauthorized unless @current_user
  end

  def current_user
    @current_user
  end

  def current_user_from_token
    return nil unless auth_token.present?

    payload = JwtService.decode(auth_token)
    User.find_by(id: payload[:user_id])
  rescue StandardError => e
    Rails.logger.info "JWT decode error: #{e.message}"
    nil
  end

  def auth_token
    # Check Authorization header first
    if request.headers["Authorization"].present?
      request.headers["Authorization"].split(" ").last
    else
      # Fall back to cookie
      cookies.signed[:auth_token]
    end
  end

  def render_unauthorized
    render json: {
      errors: [ {
        status: "401",
        title: "Unauthorized",
        detail: "Invalid or missing authentication token"
      } ]
    }, status: :unauthorized
  end
end
