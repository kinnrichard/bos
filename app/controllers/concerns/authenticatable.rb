module Authenticatable
  extend ActiveSupport::Concern

  included do
    before_action :authenticate_request
  end

  private

  def authenticate_request
    @current_user = current_user_from_token

    # Debug logging for authentication failures
    if Rails.env.development? && !@current_user
      user_id = cookies.signed[:user_id]
      token = cookies.signed[:auth_token]
      Rails.logger.info "AUTH DEBUG: Authentication failed for #{request.method} #{request.path}"
      Rails.logger.info "AUTH DEBUG: user_id cookie: #{user_id.present? ? user_id : 'MISSING'}"
      Rails.logger.info "AUTH DEBUG: auth_token cookie: #{token.present? ? 'PRESENT' : 'MISSING'}"
      Rails.logger.info "AUTH DEBUG: Current user found: #{@current_user ? @current_user.id : 'NONE'}"
    end

    render_unauthorized unless @current_user
  end

  def current_user
    @current_user
  end

  def current_user_from_token
    # Simple cookie-based authentication (temporary)
    user_id = cookies.signed[:user_id]
    token = cookies.signed[:auth_token]

    return nil unless user_id.present? && token.present?

    User.find_by(id: user_id)
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
