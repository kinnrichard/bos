class ApplicationRecord < ActiveRecord::Base
  primary_abstract_class

  # Generate cache key with version for ETag support
  def cache_key_with_version
    "#{model_name.cache_key}/#{id}-#{updated_at.to_i}"
  end
end
