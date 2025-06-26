class ActivityLog < ApplicationRecord
  belongs_to :user
  belongs_to :loggable, polymorphic: true, optional: true
  belongs_to :client, optional: true
  belongs_to :job, optional: true

  validates :action, presence: true

  # For easier querying
  scope :recent, -> { order(created_at: :desc) }
  scope :for_user, ->(user) { where(user: user) }
  scope :for_loggable, ->(loggable) { where(loggable: loggable) }
  scope :for_client, ->(client) { where(client: client) }

  # Generate human-readable log messages
  def message
    activity_type = ActivityType.find(action)

    case action
    when "created"
      "#{activity_type&.past_tense || action} #{loggable_type_emoji} #{loggable_name}"
    when "viewed"
      "#{activity_type&.past_tense || action} #{loggable_type_emoji} #{loggable_name}"
    when "renamed"
      "#{activity_type&.past_tense || action} #{metadata['old_name']} to #{metadata['new_name']}"
    when "updated"
      if metadata["changes"].present?
        # Filter out unimportant attributes
        filtered_changes = metadata["changes"].reject { |field, _|
          [ "position", "lock_version", "reordered_at", "parent_id" ].include?(field)
        }

        if filtered_changes.any?
          # Handle priority changes specially
          if filtered_changes.keys == [ "priority" ]
            old_priority = filtered_changes["priority"][0]
            new_priority = filtered_changes["priority"][1]
            priority_emoji = get_priority_emoji(new_priority)
            "marked #{loggable_type_emoji} #{loggable_name} as #{priority_emoji} #{new_priority.capitalize} Priority"
          else
            changes_text = filtered_changes.map { |field, values|
              "#{field} from '#{values[0]}' to '#{values[1]}'"
            }.join(", ")
            "#{activity_type&.past_tense || action} #{loggable_name}: #{changes_text}"
          end
        else
          # If only unimportant fields were changed, return nil to hide this log
          nil
        end
      else
        "#{activity_type&.past_tense || action} #{loggable_name}"
      end
    when "deleted"
      "#{activity_type&.past_tense || action} #{loggable_type_emoji} #{loggable_name}"
    when "assigned"
      "#{activity_type&.past_tense || action} #{loggable_type_emoji} #{loggable_name} to #{metadata['assigned_to']}"
    when "unassigned"
      "#{activity_type&.past_tense || action} #{metadata['unassigned_from']} from #{loggable_type_emoji} #{loggable_name}"
    when "status_changed"
      status_emoji = get_status_emoji(metadata["new_status"])
      "set #{loggable_type_emoji} #{loggable_name} to #{status_emoji} #{metadata['new_status_label']}"
    when "added"
      "#{activity_type&.past_tense || action} #{loggable_type_emoji} #{loggable_name} to #{metadata['parent_type']} #{metadata['parent_name']}"
    when "logged_in"
      "#{activity_type&.past_tense || 'signed into'} bŏs"
    when "logged_out"
      "#{activity_type&.past_tense || 'signed out of'} bŏs"
    else
      "#{activity_type&.icon || '•••'} #{action} #{loggable_name}"
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
    when "Person"
      "👤"
    else
      ""
    end
  end

  def activity_type_icon
    ActivityType.find(action)&.icon || "•••"
  end

  def loggable_name
    return "no metadata" if not metadata

    return metadata["name"] if metadata["name"].present?

    case loggable_type
    when "Client"
      loggable&.name || "Unknown Client"
    when "Job"
      loggable&.title || "Unknown Job"
    when "Task"
      loggable&.title || "Unknown Task"
    when "Person"
      person_name = (loggable&.name || "Unknown Person")
      "#{person_name} #{with_client_loggable_name}"
    else
      loggable_type
    end
  end

  private

  def with_client_loggable_name
    "with #{client_loggable_name}"
  end

  def client_loggable_name
    c = loggable.client
    e = c&.business? ? "🏢" : "🏠"
    "#{e} #{c.name}"
  end

  def get_status_emoji(status)
    # Try TaskStatus first, then JobStatus
    TaskStatus.find(status)&.emoji || JobStatus.find(status)&.emoji || ""
  end

  def get_priority_emoji(priority)
    # Get priority emoji based on loggable type
    context = loggable_type == "Job" ? :job : :generic
    Priority.find(priority, context: context)&.emoji || ""
  end
end
