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

    # Check if token has been revoked
    if payload[:jti] && RevokedToken.revoked?(payload[:jti])
      Rails.logger.info "Attempted to use revoked token: #{payload[:jti]}"
      return nil
    end

    User.find_by(id: payload[:user_id])
  rescue StandardError => e
    Rails.logger.info "JWT decode error: #{e.message}"
    nil
  end

  def auth_token
    # Authentication strategy:
    # 1. Bearer tokens (Authorization header) - for future Swift/native mobile apps
    # 2. HttpOnly cookies - for the Svelte PWA (better XSS protection)
    # This dual support allows the API to serve both web and mobile clients
    if request.headers["Authorization"].present?
      request.headers["Authorization"].split(" ").last
    else
      # Fall back to cookie for Svelte PWA
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
