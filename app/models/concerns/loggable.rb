# frozen_string_literal: true

module Loggable
  extend ActiveSupport::Concern

  included do
    has_many :activity_logs, as: :loggable, dependent: :destroy
    
    after_create :log_creation
    after_update :log_update
  end
  
  def log_action(action, user: nil, metadata: {})
    user ||= User.current_user if defined?(User.current_user)
    return unless user
    
    ActivityLog.create!(
      user: user,
      action: action,
      loggable: self,
      client: associated_client,
      metadata: metadata
    )
  end
  
  private
  
  def log_creation
    return unless User.current_user
    log_action('created')
  end
  
  def log_update
    return unless User.current_user
    return if saved_changes.keys == ['updated_at'] # Skip if only timestamp changed
    
    changes_data = {}
    saved_changes.except('created_at', 'updated_at').each do |field, values|
      changes_data[field] = values
    end
    
    # Handle special cases
    if saved_changes['status']
      log_action('status_changed', metadata: {
        old_status: saved_changes['status'][0],
        new_status: saved_changes['status'][1],
        new_status_label: status_label
      })
    elsif saved_changes['name'] && is_a?(Client)
      log_action('renamed', metadata: {
        old_name: saved_changes['name'][0],
        new_name: saved_changes['name'][1]
      })
    elsif saved_changes['title'] && (is_a?(Job) || is_a?(Task))
      log_action('renamed', metadata: {
        old_name: saved_changes['title'][0],
        new_name: saved_changes['title'][1]
      })
    elsif changes_data.any?
      log_action('updated', metadata: { changes: changes_data })
    end
  end
  
  def associated_client
    case self
    when Client
      self
    when Job, Person, Device
      client
    when Task
      job&.client
    when Note
      notable.respond_to?(:associated_client) ? notable.associated_client : nil
    else
      nil
    end
  end
  
  def status_label
    case self
    when Job
      status.humanize
    when Task
      case status
      when 'new_task' then 'New'
      when 'in_progress' then 'In Progress'
      when 'paused' then 'Paused'
      when 'successfully_completed' then 'Successfully Completed'
      when 'cancelled' then 'Cancelled'
      else status.humanize
      end
    else
      status.humanize if respond_to?(:status)
    end
  end
end