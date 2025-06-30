class Api::V1::HealthController < Api::V1::BaseController
  skip_before_action :authenticate_request

  def show
    # Include CSRF token in response headers for authenticated requests
    set_csrf_token_header if cookies.signed[:auth_token].present?

    render json: {
      status: "ok",
      timestamp: Time.current.iso8601,
      rails_version: Rails::VERSION::STRING,
      database: database_status
    }
  end

  private

  def database_status
    ActiveRecord::Base.connection.active?
    "connected"
  rescue StandardError
    "disconnected"
  end
end
