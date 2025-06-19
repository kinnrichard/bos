require 'ostruct'

class ApplicationController < ActionController::Base
  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern
  
  private
  
  def current_user
    # For now, create a mock user object
    @current_user ||= OpenStruct.new(
      id: 1,
      name: "Oliver Chen",
      clients: Client,
      can_delete?: ->(resource) { true }
    )
  end
  
  helper_method :current_user
end
