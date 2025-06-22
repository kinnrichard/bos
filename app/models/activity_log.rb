class ActivityLog < ApplicationRecord
  belongs_to :user
  belongs_to :loggable, polymorphic: true, optional: true
  belongs_to :client, optional: true

  validates :action, presence: true

  # For easier querying
  scope :recent, -> { order(created_at: :desc) }
  scope :for_user, ->(user) { where(user: user) }
  scope :for_loggable, ->(loggable) { where(loggable: loggable) }
  scope :for_client, ->(client) { where(client: client) }

  # Generate human-readable log messages
  def message
    user_name = user&.name || "System"

    case action
    when "created"
      "#{user_name} created #{loggable_type_emoji} #{loggable_name}"
    when "viewed"
      "#{user_name} viewed #{loggable_name}"
    when "renamed"
      "#{user_name} renamed #{metadata['old_name']} to #{metadata['new_name']}"
    when "updated"
      if metadata["changes"].present?
        changes_text = metadata["changes"].map { |field, values|
          "#{field} from '#{values[0]}' to '#{values[1]}'"
        }.join(", ")
        "#{user_name} updated #{loggable_name}: #{changes_text}"
      else
        "#{user_name} updated #{loggable_name}"
      end
    when "deleted"
      "#{user_name} deleted #{loggable_type_emoji} #{loggable_name}"
    when "assigned"
      "#{user_name} assigned #{loggable_type_emoji} #{loggable_name} to #{metadata['assigned_to']}"
    when "unassigned"
      "#{user_name} unassigned #{metadata['unassigned_from']} from #{loggable_type_emoji} #{loggable_name}"
    when "status_changed"
      status_emoji = get_status_emoji(metadata["new_status"])
      "#{user_name} marked #{loggable_type_emoji} #{loggable_name} #{status_emoji} #{metadata['new_status_label']}"
    when "added"
      "#{user_name} added #{loggable_type_emoji} #{loggable_name} to #{metadata['parent_type']} #{metadata['parent_name']}"
    else
      "#{user_name} #{action} #{loggable_name}"
    end
  end

  private

  def loggable_name
    return metadata["name"] if metadata["name"].present?

    case loggable_type
    when "Client"
      loggable&.name || "Unknown Client"
    when "Job"
      loggable&.title || "Unknown Job"
    when "Task"
      loggable&.title || "Unknown Task"
    else
      loggable_type
    end
  end

  def loggable_type_emoji
    case loggable_type
    when "Client"
      loggable&.business? ? "🏢" : "🏠"
    when "Job"
      "💼"
    when "Task"
      "☑️"
    else
      ""
    end
  end

  def get_status_emoji(status)
    case status
    when "new_task" then "⚫"
    when "in_progress" then "🟢"
    when "paused" then "⏸️"
    when "successfully_completed" then "☑️"
    when "cancelled" then "❌"
    when "open" then "⚫"
    else ""
    end
  end
end
