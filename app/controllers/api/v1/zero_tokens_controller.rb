class Api::V1::ZeroTokensController < Api::V1::BaseController
  # Skip authentication for Zero token endpoint in development
  skip_before_action :authenticate_request, only: [ :create ]

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
      # For development, use a real test user ID that exists in the database
      # Using Test Owner user for Zero development
      test_user_id = "dce47cac-673c-4491-8bec-85ab3c1b0f82"

      # Validate user exists in database
      test_user = User.find_by(id: test_user_id)
      unless test_user
        render json: { error: "Test user not found in database" }, status: :internal_server_error
        return
      end

      token = ZeroJwt.generate(user_id: test_user_id)
      render json: {
        token: token,
        user_id: test_user_id,
        user_name: test_user.name # For debugging
      }, status: :ok
    end
  end

  private
end
