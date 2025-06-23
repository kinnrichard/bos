require "ostruct"

class ApplicationController < ActionController::Base
  include SetCurrentUser

  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  before_action :require_login
  around_action :set_time_zone

  private

  def current_user
    @current_user ||= User.find_by(id: session[:user_id]) if session[:user_id]
  end

  def logged_in?
    current_user.present?
  end

  def require_login
    unless logged_in?
      redirect_to login_path(return_to: request.fullpath), alert: "Please sign in to continue"
    end
  end

  helper_method :current_user, :logged_in?

  def set_time_zone(&block)
    time_zone = cookies[:user_timezone] || "UTC"
    Time.use_zone(time_zone, &block)
  rescue ArgumentError
    # Invalid timezone, fallback to UTC
    Time.use_zone("UTC", &block)
  end
end
