class Api::V1::BaseController < ActionController::API
  include ActionController::Cookies
  include ActionController::HttpAuthentication::Token::ControllerMethods
  include Authenticatable
  include SetCurrentUser
  include ApiErrorHandler
  include ApiCsrfProtection
  include UuidFindable
  include EtagSupport

  before_action :set_request_id
  after_action :set_csrf_token_header_for_authenticated_requests

  private

  def set_request_id
    response.headers["X-Request-ID"] = request.request_id
  end

  # Automatically include CSRF token in response headers for all authenticated API requests
  def set_csrf_token_header_for_authenticated_requests
    # Only set CSRF token for authenticated requests
    # Use more lenient check to ensure tokens are distributed properly
    if should_provide_csrf_token?
      set_csrf_token_header
    end
  end

  def should_provide_csrf_token?
    # More lenient check for CSRF token distribution
    cookies.signed[:auth_token].present? ||
    cookies.signed[:user_id].present? ||
    (current_user.present? rescue false)
  end
end
