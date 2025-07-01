# frozen_string_literal: true

# TouchableConcern provides automatic cache invalidation for belongs_to relationships
#
# Usage:
#   class Task < ApplicationRecord
#     include Touchable
#     belongs_to :job  # Automatically gets touch: true
#   end
#
# Configuration:
#   class MyModel < ApplicationRecord
#     include Touchable
#
#     # Opt out of auto-touch for specific associations
#     touchable_config skip_touch: [:some_association]
#
#     # Or specify only certain associations to touch
#     touchable_config only_touch: [:job, :client]
#   end

module Touchable
  extend ActiveSupport::Concern

  # Models that should be touched when their children change
  # Add new cacheable parent models here
  TOUCHABLE_PARENTS = %w[
    job
    client
    user
    person
    task
  ].freeze

  # Associations that should NOT auto-touch (logs, metadata, etc.)
  SKIP_AUTO_TOUCH = %w[
    activity_log
    note
    refresh_token
    revoked_token
  ].freeze

  included do
    class_attribute :touchable_options, default: {}

    # Automatically patch association collections after model is loaded
    after_initialize :patch_association_collections, if: :persisted?
  end

  class_methods do
    # Configure touchable behavior for this model
    #
    # Options:
    #   skip_touch: Array of association names to not auto-touch
    #   only_touch: Array of association names to auto-touch (overrides defaults)
    #   disabled: Boolean to disable all auto-touching
    def touchable_config(options = {})
      self.touchable_options = options
    end

    # Override belongs_to to automatically add touch: true where appropriate
    def belongs_to(name, scope = nil, **options)
      # Apply auto-touch logic unless explicitly disabled
      if should_auto_touch?(name, options)
        options[:touch] = true unless options.key?(:touch)

        Rails.logger.debug "[Touchable] Auto-adding touch: true to #{self.name}##{name}" if Rails.env.development?
      end

      super(name, scope, **options)
    end


    private

    def should_auto_touch?(association_name, options)
      # Skip if touchable is disabled for this model
      return false if touchable_options[:disabled]

      # Skip if touch is explicitly set to false
      return false if options[:touch] == false

      # Skip if this association is in the skip list
      skip_list = Array(touchable_options[:skip_touch]) + SKIP_AUTO_TOUCH
      return false if skip_list.include?(association_name.to_s)

      # If only_touch is specified, only touch those associations
      if touchable_options[:only_touch].present?
        return Array(touchable_options[:only_touch]).include?(association_name.to_s)
      end

      # Check if the association name matches a touchable parent
      association_name_str = association_name.to_s

      # Handle polymorphic associations (notable, loggable, etc.)
      return false if options[:polymorphic]

      # Check if it's a known touchable parent model
      TOUCHABLE_PARENTS.include?(association_name_str) ||
        # Handle foreign key patterns like client_id -> client
        TOUCHABLE_PARENTS.any? { |parent| association_name_str.start_with?(parent) }
    end
  end

  # Instance methods for debugging and introspection
  def touchable_associations
    self.class.reflect_on_all_associations(:belongs_to)
              .select { |assoc| assoc.options[:touch] }
              .map(&:name)
  end

  def will_touch?(association_name)
    association = self.class.reflect_on_association(association_name)
    association&.options&.dig(:touch) == true
  end

  # Force cache invalidation for API endpoints
  # Use this when bulk operations might bypass touch callbacks
  def ensure_cache_fresh!
    touch unless changed?
    Rails.logger.debug "[Touchable] Cache refresh forced for #{self.class.name}##{id}" if Rails.env.development?
  end

  private

  def patch_association_collections
    # Patch has_many collections to auto-touch parent on bulk operations
    self.class.reflect_on_all_associations(:has_many).each do |association|
      collection = public_send(association.name)
      owner = self

      # Patch destroy_all to touch parent
      collection.define_singleton_method(:destroy_all) do |*args|
        result = super(*args)
        owner.touch unless owner.new_record?
        Rails.logger.debug "[Touchable] Auto-touched #{owner.class.name}##{owner.id} after destroy_all on #{association.name}" if Rails.env.development?
        result
      end

      # Patch delete_all to touch parent
      collection.define_singleton_method(:delete_all) do |*args|
        result = super(*args)
        owner.touch unless owner.new_record?
        Rails.logger.debug "[Touchable] Auto-touched #{owner.class.name}##{owner.id} after delete_all on #{association.name}" if Rails.env.development?
        result
      end

      # Patch clear to touch parent
      collection.define_singleton_method(:clear) do |*args|
        result = super(*args)
        owner.touch unless owner.new_record?
        Rails.logger.debug "[Touchable] Auto-touched #{owner.class.name}##{owner.id} after clear on #{association.name}" if Rails.env.development?
        result
      end
    end
  end
end
