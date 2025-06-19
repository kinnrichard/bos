require 'ostruct'

class ApplicationController < ActionController::Base
  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern
  
  private
  
  def current_user
    # TODO: Replace with actual authentication
    @current_user ||= User.first || User.create!(
      name: "System User",
      email: "system@example.com", 
      role: :admin
    )
  end
  
  helper_method :current_user
end
