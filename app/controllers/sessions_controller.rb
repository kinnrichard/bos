class SessionsController < ApplicationController
  skip_before_action :require_login, only: [:new, :create]
  
  def new
    redirect_to root_path if logged_in?
    render Views::Sessions::NewView.new(return_to: params[:return_to])
  end

  def create
    user = User.find_by(email: params[:email].downcase)
    
    if user && user.authenticate(params[:password])
      session[:user_id] = user.id
      
      # Log the login
      ActivityLog.create!(
        user: user,
        action: 'logged_in',
        loggable: user,
        metadata: { ip_address: request.remote_ip }
      )
      
      redirect_to params[:return_to].presence || root_path, notice: "Welcome back, #{user.name}!"
    else
      flash.now[:alert] = "Invalid email or password"
      render Views::Sessions::NewView.new(return_to: params[:return_to]), status: :unprocessable_entity
    end
  end

  def destroy
    if current_user
      ActivityLog.create!(
        user: current_user,
        action: 'logged_out',
        loggable: current_user
      )
    end
    
    session.delete(:user_id)
    redirect_to login_path, notice: "You have been logged out"
  end
end