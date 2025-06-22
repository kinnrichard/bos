class HomeController < ApplicationController
  def show
    render Views::Home::ShowView.new(current_user: current_user)
  end

  private
end
