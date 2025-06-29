class ApplicationRecord < ActiveRecord::Base
  primary_abstract_class

  include UuidAssociations

  # Generate cache key with version for ETag support
  def cache_key_with_version
    # Use UUID for cache key if available, fallback to ID
    identifier = respond_to?(:uuid) && uuid.present? ? uuid : id
    timestamp = updated_at&.utc&.to_fs(:usec) || "nil"
    "#{model_name.cache_key}/#{identifier}-#{timestamp}"
  end

  # Override to_param to use UUID for URLs
  def to_param
    uuid
  end

  # Class method to find by either ID or UUID
  def self.find_by_id_or_uuid!(identifier)
    if identifier.to_s.match?(/\A[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\z/i)
      find_by!(uuid: identifier)
    else
      find(identifier)
    end
  end
end
