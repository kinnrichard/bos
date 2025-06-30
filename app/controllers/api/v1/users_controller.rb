class Api::V1::UsersController < Api::V1::BaseController
  before_action :authenticate_request

  # GET /api/v1/users
  def index
    @users = User.all

    render json: {
      data: @users.map { |user| user_data(user) }
    }
  end

  private

  def user_data(user)
    {
      id: user.id,
      type: "users",
      attributes: {
        name: user.name,
        email: user.email,
        role: user.role,
        initials: user.initials,
        avatar_style: user.avatar_style,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    }
  end
end
