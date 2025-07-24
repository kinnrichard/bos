class Task < ApplicationRecord
  include Discard::Model
  include Loggable

  # Disable all touchable behavior for Task to prevent conflicts
  touchable_config disabled: true

  belongs_to :job, touch: false
  belongs_to :assigned_to, class_name: "User", optional: true
  belongs_to :parent, class_name: "Task", optional: true, counter_cache: :subtasks_count

  has_many :notes, as: :notable, dependent: :destroy
  has_many :activity_logs, as: :loggable, dependent: :destroy
  has_many :subtasks, class_name: "Task", foreign_key: :parent_id, dependent: :destroy

  enum :status, {
    new_task: "new_task",
    in_progress: "in_progress",
    paused: "paused",
    successfully_completed: "successfully_completed",
    cancelled: "cancelled"
  }

  validates :title, presence: true
  validates :status, presence: true
  validate :prevent_self_reference
  validate :prevent_circular_reference

  # For drag and drop reordering
  positioned on: [ :job_id, :parent_id ]

  # Scopes - discard gem provides kept, discarded, with_discarded
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

  # Touch job updated_at without incrementing lock_version
  after_save :touch_job_updated_at
  after_destroy :touch_job_updated_at

  # Check if automatic rebalancing is needed after position changes
  after_save :check_for_rebalancing, if: :saved_change_to_position?


  # Temporarily disable optimistic locking for positioning compatibility testing
  self.locking_column = nil

  # Value object integration
  def status_object
    TaskStatus.new(status)
  end

  # Delegate display methods to value object
  delegate :emoji, :label, :color, :with_emoji,
           to: :status_object, prefix: :status

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
    TimeFormat.duration(time_in_progress)
  end

  # Check if this task has subtasks
  def has_subtasks?
    subtasks_count > 0
  end

  # Check if this is a subtask
  def is_subtask?
    parent_id.present?
  end

  # Custom discard method with subtask validation
  def discard_with_subtask_check
    return false if discarded?

    # Check if task has non-discarded subtasks
    if subtasks.kept.exists?
      errors.add(:base, "Cannot delete task with active subtasks. Please delete or move subtasks first.")
      return false
    end

    discard
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

  # Value object integration

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

    # Get all sibling tasks (same parent_id) ordered by status - only kept tasks
    siblings = Task.kept.where(job_id: job_id, parent_id: parent_id)
                   .ordered_by_status

    # Use positioning gem's approach with optimized checks
    Task.transaction do
      siblings.each_with_index do |task, index|
        new_position = index + 1
        # Only update if position actually changed - reduces unnecessary DB calls
        if task.position != new_position
          task.update!(position: new_position)
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

  def touch_job_updated_at
    # Update job's updated_at timestamp without incrementing lock_version
    # This preserves the "last activity" tracking without causing lock conflicts
    job.update_column(:updated_at, Time.current) if job.present?
  end

  def check_for_rebalancing
    # Skip if this is already part of a rebalancing operation
    return if Thread.current[:skip_rebalancing_check]

    # Get sibling tasks in the same scope
    siblings = Task.kept.where(job_id: job_id, parent_id: parent_id).order(:position).pluck(:id, :position)

    # Only check if there are enough tasks to matter
    return if siblings.count < 10

    # Check if rebalancing is needed
    if needs_automatic_rebalancing?(siblings)
      # Trigger rebalancing in background to avoid blocking
      RebalanceTasksJob.perform_later(job_id, parent_id)
    end
  end

  def needs_automatic_rebalancing?(siblings)
    return false if siblings.count < 2

    positions = siblings.map { |_, pos| pos }
    gaps = []

    # Calculate gaps between consecutive positions
    (1...positions.length).each do |i|
      gap = positions[i] - positions[i-1]
      gaps << gap if gap > 0
    end

    return false if gaps.empty?

    min_gap = gaps.min

    # Trigger rebalancing if:
    # 1. Any gap is less than 2 (approaching precision limits)
    # 2. We're approaching integer limits
    min_gap < 2 || positions.last > 2_000_000_000
  end

  # Removed skip_lock_version_for_position_updates method - using locking_column = nil instead
end
