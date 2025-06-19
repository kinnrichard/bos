require 'ostruct'

class ApplicationController < ActionController::Base
  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern
  
  private
  
  def current_user
    # For now, use the System user
    @current_user ||= User.find_by(id: 1) || User.first
  end
  
  helper_method :current_user
end
