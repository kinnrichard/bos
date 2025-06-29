# Rack::Attack configuration for API rate limiting
# TEMPORARILY DISABLED FOR DEVELOPMENT/TESTING

class Rack::Attack
  # Configure cache store (uses Rails cache by default)
  Rack::Attack.cache.store = ActiveSupport::Cache::MemoryStore.new

  # ALL THROTTLING RULES COMMENTED OUT FOR TESTING

  # # Throttle all requests by IP (60rpm)
  # throttle("req/ip", limit: 1000, period: 1.hour) do |req|
  #   req.ip if req.path.start_with?("/api")
  # end

  # # Throttle login attempts by IP address
  # throttle("logins/ip", limit: 10, period: 1.hour) do |req|
  #   if req.path == "/api/v1/auth/login" && req.post?
  #     req.ip
  #   end
  # end

  # # Throttle login attempts by email param
  # throttle("logins/email", limit: 10, period: 1.hour) do |req|
  #   if req.path == "/api/v1/auth/login" && req.post?
  #     req.params["email"].presence
  #   end
  # end

  # # Throttle refresh token attempts by IP
  # throttle("refresh/ip", limit: 5, period: 1.hour) do |req|
  #   if req.path == "/api/v1/auth/refresh" && req.post?
  #     req.ip
  #   end
  # end

  # # Throttle sync endpoints per device
  # throttle("sync/device", limit: 100, period: 1.hour) do |req|
  #   if req.path.start_with?("/api/v1/sync")
  #     req.env["HTTP_X_DEVICE_ID"]
  #   end
  # end

  # Custom throttle response
  self.throttled_responder = lambda do |req|
    match_data = req.env["rack.attack.match_data"]
    now = match_data[:epoch_time]

    headers = {
      "Content-Type" => "application/json",
      "X-RateLimit-Limit" => match_data[:limit].to_s,
      "X-RateLimit-Remaining" => "0",
      "X-RateLimit-Reset" => (now + (match_data[:period] - now % match_data[:period])).to_s
    }

    [ 429, headers, [ {
      errors: [ {
        status: "429",
        code: "RATE_LIMITED",
        title: "Too Many Requests",
        detail: "Rate limit exceeded. Please try again later."
      } ]
    }.to_json ] ]
  end
end

# Rack::Attack COMPLETELY DISABLED FOR TESTING
# Rails.application.config.middleware.use Rack::Attack
