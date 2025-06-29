module ApiCsrfProtection
  extend ActiveSupport::Concern

  included do
    # Only verify CSRF token for cookie-based auth (not Bearer token auth)
    before_action :verify_csrf_token_for_cookie_auth
  end

  private

  def verify_csrf_token_for_cookie_auth
    # Skip CSRF check if using Bearer token authentication
    return if request.headers["Authorization"].present?

    # Skip CSRF check for safe methods
    return if request.get? || request.head? || request.options?

    # Skip CSRF check if no auth cookie is present (unauthenticated request)
    return unless cookies.signed[:auth_token].present?

    # Verify CSRF token for cookie-based authentication
    unless valid_csrf_token?
      render json: {
        errors: [ {
          status: "403",
          code: "INVALID_CSRF_TOKEN",
          title: "CSRF Token Validation Failed",
          detail: "The CSRF token is missing or invalid. For cookie-based authentication, include a valid CSRF token in the X-CSRF-Token header."
        } ]
      }, status: :forbidden
    end
  end

  def valid_csrf_token?
    # Get CSRF token from header
    token_from_header = request.headers["X-CSRF-Token"] || request.headers["X-XSRF-Token"]
    return false if token_from_header.blank?

    # Get session token (we'll store it in the session for API requests)
    session_token = session[:_csrf_token] ||= generate_csrf_token

    # Verify token matches
    ActiveSupport::SecurityUtils.secure_compare(token_from_header, session_token)
  end

  def generate_csrf_token
    SecureRandom.base64(32)
  end

  # Include CSRF token in response headers for client to use
  def set_csrf_token_header
    response.headers["X-CSRF-Token"] = session[:_csrf_token] ||= generate_csrf_token
  end
end
