class ScheduledDateTime < ApplicationRecord
  # Polymorphic association to any schedulable model (Job, etc.)
  belongs_to :schedulable, polymorphic: true

  # Many-to-many relationship with users (technicians)
  has_many :scheduled_date_time_users, dependent: :destroy
  has_many :users, through: :scheduled_date_time_users

  # Validations
  validates :scheduled_type, presence: true
  validates :scheduled_date, presence: true
  validates :scheduled_type, inclusion: {
    in: %w[due start followup],
    message: "%{value} is not a valid scheduled type"
  }

  # Value object integration
  def scheduled_type_object
    ScheduleType.new(scheduled_type)
  end

  # Delegate display methods to value object
  delegate :emoji, :label, :description, :color, :with_emoji,
           to: :scheduled_type_object, prefix: :scheduled_type

  alias_method :type_emoji, :scheduled_type_emoji
  alias_method :type_label, :scheduled_type_label

  # Scopes
  scope :due_dates, -> { where(scheduled_type: "due") }
  scope :start_dates, -> { where(scheduled_type: "start") }
  scope :followup_dates, -> { where(scheduled_type: "followup") }
  scope :upcoming, -> { where("scheduled_date >= ?", Date.current).order(:scheduled_date, :scheduled_time) }
  scope :past, -> { where("scheduled_date < ?", Date.current).order(scheduled_date: :desc, scheduled_time: :desc) }
  scope :for_date, ->(date) { where(scheduled_date: date) }
  scope :with_time, -> { where.not(scheduled_time: nil) }
  scope :without_time, -> { where(scheduled_time: nil) }

  # Class methods
  def self.scheduled_types
    {
      due: "Due Date",
      start: "Start Date",
      followup: "Followup"
    }
  end

  # Instance methods
  def due?
    scheduled_type == "due"
  end

  def start?
    scheduled_type == "start"
  end

  def followup?
    scheduled_type == "followup"
  end

  def datetime
    return scheduled_date.to_datetime unless scheduled_time

    DateTime.new(
      scheduled_date.year,
      scheduled_date.month,
      scheduled_date.day,
      scheduled_time.hour,
      scheduled_time.min,
      scheduled_time.sec
    )
  end

  def display_datetime
    if scheduled_time
      "#{scheduled_date.strftime('%B %d, %Y')} at #{scheduled_time.strftime('%l:%M %p').strip}"
    else
      scheduled_date.strftime("%B %d, %Y")
    end
  end
end
