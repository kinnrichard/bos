# SolidQueue configuration for development
# This is a simple configuration for development use

# SolidQueue uses config/queue.yml for configuration
# The initializer here is just for any runtime configuration or hooks

if defined?(SolidQueue) && Rails.env.development?
  # Set up logging
  SolidQueue.logger = Rails.logger

  # For development, we can use a simpler configuration
  # The actual queue configuration is in config/queue.yml

  # Optional: Add performance monitoring
  ActiveSupport::Notifications.subscribe("perform.active_job") do |name, started, finished, unique_id, data|
    job = data[:job]
    duration = finished - started

    if duration > 10.seconds
      Rails.logger.warn "Long running job: #{job.class.name} took #{duration.round(2)}s"
    end
  end
end
