class UsersController < ApplicationController
  before_action :require_superadmin
  before_action :set_user, only: [:edit, :update, :destroy]
  
  def index
    @users = User.order(:name)
    render Views::Users::IndexView.new(users: @users, current_user: current_user)
  end

  def new
    @user = User.new
    render Views::Users::NewView.new(user: @user, current_user: current_user)
  end

  def create
    @user = User.new(user_params)
    
    if @user.save
      ActivityLog.create!(
        user: current_user,
        action: 'created',
        loggable: @user,
        metadata: { 
          user_name: @user.name, 
          user_email: @user.email,
          user_role: @user.role 
        }
      )
      redirect_to users_path, notice: "User #{@user.name} was successfully created."
    else
      render Views::Users::NewView.new(user: @user, current_user: current_user), status: :unprocessable_entity
    end
  end

  def edit
    render Views::Users::EditView.new(user: @user, current_user: current_user)
  end

  def update
    # Don't require password if it's blank
    if params[:user][:password].blank?
      params[:user].delete(:password)
      params[:user].delete(:password_confirmation)
    end
    
    if @user.update(user_params)
      ActivityLog.create!(
        user: current_user,
        action: 'updated',
        loggable: @user,
        metadata: { 
          user_name: @user.name,
          changes: @user.saved_changes.except('updated_at', 'password_digest')
        }
      )
      redirect_to users_path, notice: "User #{@user.name} was successfully updated."
    else
      render Views::Users::EditView.new(user: @user, current_user: current_user), status: :unprocessable_entity
    end
  end

  def destroy
    user_name = @user.name
    user_email = @user.email
    
    if @user == current_user
      redirect_to users_path, alert: "You cannot delete your own account."
      return
    end
    
    @user.destroy
    
    ActivityLog.create!(
      user: current_user,
      action: 'deleted',
      loggable_type: 'User',
      loggable_id: @user.id,
      metadata: { 
        user_name: user_name,
        user_email: user_email
      }
    )
    
    redirect_to users_path, notice: "User #{user_name} was successfully deleted."
  end

  private

  def set_user
    @user = User.find(params[:id])
  end

  def user_params
    params.require(:user).permit(:name, :email, :password, :password_confirmation, :role)
  end
  
  def require_superadmin
    unless current_user&.superadmin?
      redirect_to root_path, alert: "You don't have permission to access this page."
    end
  end
end