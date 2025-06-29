class ApplicationRecord < ActiveRecord::Base
  primary_abstract_class

  include UuidAssociations

  # Generate cache key with version for ETag support
  def cache_key_with_version
    "#{model_name.cache_key}/#{id}-#{updated_at.to_i}"
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
