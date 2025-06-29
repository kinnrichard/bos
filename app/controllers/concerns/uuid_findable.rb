# Concern to handle UUID-based resource finding in controllers
module UuidFindable
  extend ActiveSupport::Concern

  private

  # Find a record by either ID or UUID
  def find_record(model_class, identifier)
    model_class.find_by_id_or_uuid!(identifier)
  rescue ActiveRecord::RecordNotFound
    nil
  end

  # Helper method to determine if an identifier is a UUID
  def uuid?(identifier)
    identifier.to_s.match?(/\A[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\z/i)
  end
end
