class Job < ApplicationRecord
  include Loggable

  belongs_to :client

  has_many :job_assignments, dependent: :destroy
  has_many :technicians, through: :job_assignments, source: :user
  has_many :job_people, dependent: :destroy
  has_many :people, through: :job_people
  has_many :tasks, -> { kept }, dependent: :destroy
  has_many :all_tasks, -> { with_discarded }, class_name: "Task", dependent: :destroy
  has_many :notes, as: :notable, dependent: :destroy
  has_many :scheduled_date_times, as: :schedulable, dependent: :destroy

  enum :status, {
    open: "open",
    in_progress: "in_progress",
    paused: "paused",
    waiting_for_customer: "waiting_for_customer",
    waiting_for_scheduled_appointment: "waiting_for_scheduled_appointment",
    successfully_completed: "successfully_completed",
    cancelled: "cancelled"
  }

  enum :priority, {
    critical: "critical",
    high: "high",
    normal: "normal",
    low: "low",
    proactive_followup: "proactive_followup"
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
  scope :overdue, -> { where("due_at < ?", Time.current) }
  scope :upcoming, -> { where("due_at >= ?", Date.current.beginning_of_day) }

  # Set defaults
  after_initialize :set_defaults, if: :new_record?

  # Temporarily disable optimistic locking to prevent stale object errors
  self.locking_column = nil

  # Convenience methods for date/time handling
  def overdue?
    return false unless due_at
    due_at < Time.current
  end

  def days_until_due
    return nil unless due_at
    ((due_at.to_date - Date.current).to_i)
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
