class Job < ApplicationRecord
  include Loggable
  include Touchable

  belongs_to :client
  belongs_to :created_by, class_name: "User"

  has_many :job_assignments, dependent: :destroy
  has_many :technicians, through: :job_assignments, source: :user
  has_many :job_people, dependent: :destroy
  has_many :people, through: :job_people
  has_many :tasks, dependent: :destroy
  has_many :notes, as: :notable, dependent: :destroy
  has_many :scheduled_date_times, as: :schedulable, dependent: :destroy

  enum :status, {
    open: 0,
    in_progress: 1,
    paused: 2,
    waiting_for_customer: 3,
    waiting_for_scheduled_appointment: 4,
    successfully_completed: 5,
    cancelled: 6
  }

  enum :priority, {
    critical: 0,
    high: 1,
    normal: 2,
    low: 3,
    proactive_followup: 4
  }

  validates :title, presence: true
  validates :status, presence: true
  validates :priority, presence: true

  # Scopes
  scope :my_jobs, ->(user) { joins(:job_assignments).where(job_assignments: { user_id: user.id }) }
  scope :unassigned, -> { left_joins(:job_assignments).where(job_assignments: { id: nil }) }
  scope :assigned_to_others, ->(user) {
    joins(:job_assignments)
    .where.not(job_assignments: { user_id: user.id })
    .distinct
  }
  scope :closed, -> { where(status: [ :successfully_completed, :cancelled ]) }
  scope :active, -> { where.not(status: [ :successfully_completed, :cancelled ]) }
  scope :overdue, -> { where("due_on < ?", Date.current).or(where(due_on: Date.current, due_time: ...Time.current)) }
  scope :upcoming, -> { where("due_on >= ?", Date.current) }

  # Set defaults
  after_initialize :set_defaults, if: :new_record?

  # Temporarily disable optimistic locking to prevent stale object errors
  self.locking_column = nil

  # Computed datetime methods
  def due_at
    return nil unless due_on
    if due_time
      DateTime.new(due_on.year, due_on.month, due_on.day, due_time.hour, due_time.min, due_time.sec)
    else
      due_on.to_datetime
    end
  end

  def start_at
    return nil unless start_on
    if start_time
      DateTime.new(start_on.year, start_on.month, start_on.day, start_time.hour, start_time.min, start_time.sec)
    else
      start_on.to_datetime
    end
  end

  def overdue?
    return false unless due_at
    due_at < Time.current
  end

  def days_until_due
    return nil unless due_on
    (due_on - Date.current).to_i
  end

  # Scheduled DateTime helpers
  def due_date
    scheduled_date_times.due_dates.first
  end

  def start_date
    scheduled_date_times.start_dates.first
  end

  def followup_dates
    scheduled_date_times.followup_dates
  end

  def upcoming_scheduled_dates
    scheduled_date_times.upcoming
  end

  def has_scheduled_dates?
    scheduled_date_times.any?
  end

  # Value object integration
  def status_object
    @status_object ||= JobStatus.new(status)
  end

  def priority_object
    @priority_object ||= JobPriority.new(priority)
  end

  # Delegate display methods to value objects
  delegate :emoji, :label, :color, :with_emoji,
           to: :status_object,
           prefix: :status

  delegate :emoji, :label, :color, :with_emoji, :sort_order,
           to: :priority_object,
           prefix: :priority

  private

  def set_defaults
    self.status ||= :open
    self.priority ||= :normal
  end
end
