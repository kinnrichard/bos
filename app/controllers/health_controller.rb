class HealthController < ActionController::Base
  # Skip all before_actions including migration check
  skip_before_action :verify_authenticity_token, raise: false

  def show
    # Simple health check that doesn't require database
    render plain: "OK", status: :ok
  end
end
