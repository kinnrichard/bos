# Temporary fix - clear cache on startup to handle key mismatch
if Rails.env.production? && ENV['CLEAR_CACHE_ON_STARTUP'] == 'true'
  Rails.application.config.after_initialize do
    Rails.cache.clear rescue nil
    Rails.logger.info "Cache cleared on startup due to key mismatch"
  end
end
