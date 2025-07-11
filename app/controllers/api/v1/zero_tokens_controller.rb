class Api::V1::ZeroTokensController < Api::V1::BaseController
  # Users must be authenticated to get Zero tokens
  # CSRF protection is required for security

  def create
    # Use the current authenticated user from session
    user = current_user

    if user
      token = ZeroJwt.generate(user_id: user.id)
      render json: {
        token: token,
        user_id: user.id.to_s  # Zero needs string user ID
      }, status: :ok
    else
      render json: { error: "User not authenticated" }, status: :unauthorized
    end
  end

  private
end
