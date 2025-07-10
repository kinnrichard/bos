class Api::V1::ZeroTokensController < Api::V1::BaseController
  # Users must be authenticated to get Zero tokens
  # CSRF protection is required for security

  def create
    # For development, we'll use a simple user lookup
    # In production, this should be part of your auth flow
    user = find_or_create_user

    if user
      token = ZeroJwt.generate(user_id: user.id)
      render json: { token: token }, status: :ok
    else
      render json: { error: "Unable to generate token" }, status: :unauthorized
    end
  end

  private

  def find_or_create_user
    # For development - in production, use your existing auth
    if params[:user_id].present?
      User.find_by(id: params[:user_id])
    elsif params[:email].present?
      User.find_by(email: params[:email])
    else
      # For development only - create a default user
      User.first || User.create!(
        name: "Development User",
        email: "dev@example.com",
        password: "password",
        role: "admin"
      )
    end
  end
end
