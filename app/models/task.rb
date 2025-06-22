class Task < ApplicationRecord
  include Loggable

  belongs_to :job
  belongs_to :assigned_to, class_name: "User", optional: true
  belongs_to :parent, class_name: "Task", optional: true, counter_cache: :subtasks_count

  has_many :notes, as: :notable, dependent: :destroy
  has_many :activity_logs, as: :loggable, dependent: :destroy
  has_many :subtasks, class_name: "Task", foreign_key: :parent_id, dependent: :destroy

  enum :status, {
    new_task: 0,
    in_progress: 1,
    paused: 2,
    successfully_completed: 3,
    cancelled: 4
  }

  validates :title, presence: true
  validates :status, presence: true
  validate :prevent_self_reference
  validate :prevent_circular_reference

  # For drag and drop reordering
  acts_as_list scope: [ :job_id, :parent_id ]

  # Scopes
  scope :root_tasks, -> { where(parent_id: nil) }
  scope :subtasks_of, ->(task) { where(parent_id: task.id) }

  # Consistent ordering by status - cancelled tasks go to the bottom
  scope :ordered_by_status, -> {
    order(Arel.sql("CASE
      WHEN status = 1 THEN 1
      WHEN status = 2 THEN 2
      WHEN status = 0 THEN 3
      WHEN status = 3 THEN 4
      WHEN status = 4 THEN 5
      END, position ASC"))
  }

  # Set defaults
  after_initialize :set_defaults, if: :new_record?

  # Automatically reorder tasks when status changes
  after_update :reorder_by_status, if: :saved_change_to_status?

  # Update reordered_at when position or parent changes
  before_save :update_reordered_at, if: -> { position_changed? || parent_id_changed? }

  # Status emoji helpers
  def status_emoji
    case status
    when "new_task" then "⚫️"
    when "in_progress" then "🟢"
    when "paused" then "⏸️"
    when "successfully_completed" then "☑️"
    when "cancelled" then "❌"
    end
  end

  # Calculate total time spent in 'in_progress' status
  def time_in_progress
    total_seconds = 0

    # Get all status change logs for this task, ordered by time
    status_logs = activity_logs
      .where(action: "status_changed")
      .order(:created_at)

    # Track when task went into in_progress
    in_progress_start = nil

    status_logs.each do |log|
      new_status = log.metadata["new_status"]

      if new_status == "in_progress"
        # Task went into in_progress
        in_progress_start = log.created_at
      elsif in_progress_start.present?
        # Task left in_progress status
        total_seconds += (log.created_at - in_progress_start)
        in_progress_start = nil
      end
    end

    # If currently in_progress, add time from last start to now
    if in_progress? && in_progress_start.present?
      total_seconds += (Time.current - in_progress_start)
    end

    total_seconds
  end

  # Format time in progress as human readable
  def formatted_time_in_progress
    seconds = time_in_progress
    return nil if seconds == 0

    hours = (seconds / 3600).floor
    minutes = ((seconds % 3600) / 60).floor

    parts = []
    parts << "#{hours}h" if hours > 0
    parts << "#{minutes}m" if minutes > 0 || hours == 0

    parts.join(" ")
  end

  # Check if this task has subtasks
  def has_subtasks?
    subtasks_count > 0
  end

  # Check if this is a subtask
  def is_subtask?
    parent_id.present?
  end

  # Get the root task (top-level parent)
  def root_task
    current = self
    while current.parent
      current = current.parent
    end
    current
  end

  # Calculate progress based on subtasks
  def progress_percentage
    return 100 if successfully_completed?
    return 0 unless has_subtasks?

    completed = subtasks.successfully_completed.count
    total = subtasks.count
    return 0 if total == 0

    (completed.to_f / total * 100).round
  end

  private

  def set_defaults
    self.status ||= :new_task
  end

  def prevent_self_reference
    errors.add(:parent_id, "can't reference itself") if parent_id.present? && parent_id == id
  end

  def prevent_circular_reference
    return unless parent_id_changed? && parent_id.present?

    current = parent
    visited = Set.new([ id ])

    while current
      if visited.include?(current.id)
        errors.add(:parent_id, "would create a circular reference")
        break
      end
      visited.add(current.id)
      current = current.parent
    end
  end

  def reorder_by_status
    return unless resort_enabled?

    # Get all sibling tasks (same parent_id) ordered by status
    siblings = Task.where(job_id: job_id, parent_id: parent_id)
                   .ordered_by_status

    # Temporarily disable acts_as_list callbacks to avoid conflicts
    Task.acts_as_list_no_update do
      siblings.each_with_index do |task, index|
        new_position = index + 1
        if task.position != new_position
          task.update_column(:position, new_position)
        end
      end
    end
  end

  def resort_enabled?
    # Check if the user has resort enabled
    job&.created_by&.resort_tasks_on_status_change
  end

  def update_reordered_at
    self.reordered_at = Time.current
  end
end
