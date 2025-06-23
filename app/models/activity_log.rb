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
    case action
    when "created"
      if loggable_type == "Task" && loggable.respond_to?(:job) && loggable.job
        "created #{loggable_type_emoji} #{loggable_name} in 💼 #{loggable.job.title}"
      else
        "created #{loggable_type_emoji} #{loggable_name}"
      end
    when "viewed"
      "viewed #{loggable_type_emoji} #{loggable_name}"
    when "renamed"
      "renamed #{metadata['old_name']} to #{metadata['new_name']}"
    when "updated"
      if metadata["changes"].present?
        changes_text = metadata["changes"].map { |field, values|
          "#{field} from '#{values[0]}' to '#{values[1]}'"
        }.join(", ")
        "updated #{loggable_name}: #{changes_text}"
      else
        "updated #{loggable_name}"
      end
    when "deleted"
      "deleted #{loggable_type_emoji} #{loggable_name}"
    when "assigned"
      "assigned #{loggable_type_emoji} #{loggable_name} to #{metadata['assigned_to']}"
    when "unassigned"
      "unassigned #{metadata['unassigned_from']} from #{loggable_type_emoji} #{loggable_name}"
    when "status_changed"
      status_emoji = get_status_emoji(metadata["new_status"])
      "marked #{loggable_type_emoji} #{loggable_name} #{status_emoji} #{metadata['new_status_label']}"
    when "added"
      "added #{loggable_type_emoji} #{loggable_name} to #{metadata['parent_type']} #{metadata['parent_name']}"
    when "logged_in"
      "signed into bŏs"
    when "logged_out"
      "signed out of bŏs"
    else
      "••• #{action} #{loggable_name}"
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
