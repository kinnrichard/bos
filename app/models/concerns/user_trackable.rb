# User attribution concern for models
# Validates that created_by and updated_by match the authenticated user
# Prevents client-side falsification of user attribution
module UserTrackable
  extend ActiveSupport::Concern

  included do
    # Only set up associations if columns exist
    if column_names.include?("created_by_id")
      belongs_to :created_by, class_name: "User", optional: false
    end

    if column_names.include?("updated_by_id")
      belongs_to :updated_by, class_name: "User", optional: false
    end

    before_validation :set_user_attribution, on: :create
    before_validation :update_user_attribution, on: :update

    validate :validate_created_by, on: :create
    validate :validate_updated_by
  end

  private

  def set_user_attribution
    if respond_to?(:created_by_id=)
      self.created_by_id ||= Current.user&.id
    end

    if respond_to?(:updated_by_id=)
      self.updated_by_id ||= Current.user&.id
    end
  end

  def update_user_attribution
    if respond_to?(:updated_by_id=)
      self.updated_by_id = Current.user&.id
    end
  end

  def validate_created_by
    return unless respond_to?(:created_by_id)

    if created_by_id.present? && created_by_id != Current.user&.id
      errors.add(:created_by_id, "must match authenticated user")
    end

    if created_by_id.blank? && Current.user.blank?
      errors.add(:created_by_id, "requires authenticated user")
    end
  end

  def validate_updated_by
    return unless respond_to?(:updated_by_id)

    if updated_by_id.present? && updated_by_id != Current.user&.id
      errors.add(:updated_by_id, "must match authenticated user")
    end

    if updated_by_id.blank? && Current.user.blank?
      errors.add(:updated_by_id, "requires authenticated user")
    end
  end
end
