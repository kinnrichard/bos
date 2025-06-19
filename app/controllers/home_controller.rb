class HomeController < ApplicationController
  def show
    render Views::Home::ShowView.new(current_user: current_user)
  end
  
  private
  
  def current_user
    # TODO: Replace with actual current user from authentication
    @current_user ||= User.first || User.create!(
      name: "System User",
      email: "system@example.com",
      role: :admin
    )
  end
end