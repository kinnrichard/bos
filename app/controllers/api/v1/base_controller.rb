class Api::V1::BaseController < ActionController::API
  include ActionController::Cookies
  include ActionController::HttpAuthentication::Token::ControllerMethods
  include Authenticatable
  include ApiErrorHandler
  include UuidFindable

  before_action :set_request_id

  private

  def set_request_id
    response.headers["X-Request-ID"] = request.request_id
  end
end
