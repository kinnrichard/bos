require 'ostruct'

class HomeController < ApplicationController
  def show
    # For now, create a mock user object
    current_user = OpenStruct.new(name: "Oliver")
    
    render Views::Home::ShowView.new(current_user: current_user)
  end
end