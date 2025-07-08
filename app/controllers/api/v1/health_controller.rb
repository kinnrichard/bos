class Api::V1::HealthController < Api::V1::BaseController
  skip_before_action :authenticate_request
  skip_before_action :verify_csrf_token_for_cookie_auth

  def show
    # Include CSRF token in response headers for authenticated requests
    # Be more lenient - provide CSRF token if there's any sign of authentication
    if should_provide_csrf_token?
      Rails.logger.info "HEALTH: Providing CSRF token" if Rails.env.development?
      set_csrf_token_header
    else
      Rails.logger.info "HEALTH: No CSRF token provided - no auth detected" if Rails.env.development?
    end

    render json: {
      status: "ok",
      timestamp: Time.current.iso8601,
      rails_version: Rails::VERSION::STRING,
      database: database_status
    }
  end

  # Development debugging endpoint to test CSRF
  def csrf_test
    return head :not_found unless Rails.env.development?

    # Always provide CSRF token for testing
    set_csrf_token_header

    render json: {
      status: "csrf_test",
      has_user_id_cookie: cookies.signed[:user_id].present?,
      has_auth_token_cookie: cookies.signed[:auth_token].present?,
      user_id_value: cookies.signed[:user_id],
      auth_token_preview: cookies.signed[:auth_token]&.first(10),
      all_cookies: cookies.to_h.keys,
      session_id: session.id,
      csrf_token_in_session: session[:_csrf_token].present?,
      csrf_token_preview: session[:_csrf_token]&.first(10),
      current_user_present: current_user.present?
    }
  end

  # CSRF token endpoint for frontend tests
  def csrf_token
    return head :not_found unless Rails.env.test?

    # Generate CSRF token for test environment
    # Ensure session is initialized
    session[:_csrf_token] ||= SecureRandom.base64(32)
    token = session[:_csrf_token]

    render json: {
      csrf_token: token,
      timestamp: Time.current.iso8601
    }
  end

  private

  def should_provide_csrf_token?
    # Provide CSRF token if there's any indication of authentication
    # This is more lenient than the strict auth check to help with token distribution
    cookies.signed[:auth_token].present? ||
    cookies.signed[:user_id].present? ||
    request.headers["Authorization"].present? ||
    session[:user_id].present?
  end

  def database_status
    ActiveRecord::Base.connection.active?
    "connected"
  rescue StandardError
    "disconnected"
  end
end
