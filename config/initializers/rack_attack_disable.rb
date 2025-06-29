# Disable Rack::Attack completely
if defined?(Rack::Attack)
  # Remove from middleware stack
  Rails.application.config.middleware.delete Rack::Attack

  # Stub the class to prevent any calls
  class Rack::Attack
    def self.enabled?
      false
    end

    def call(env)
      @app.call(env)
    end
  end
end
