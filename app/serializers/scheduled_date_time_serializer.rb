class ScheduledDateTimeSerializer < ApplicationSerializer
  set_type :scheduled_date_times

  attributes :scheduled_type, :scheduled_date, :scheduled_time, :notes

  timestamp_attributes :created_at, :updated_at

  # API compatibility attributes
  attribute :duration_minutes do |scheduled|
    60 # Default duration
  end

  attribute :status do |scheduled|
    "confirmed"
  end

  attribute :metadata do |scheduled|
    {}
  end

  attribute :schedule_type do |scheduled|
    scheduled.scheduled_type
  end

  # Polymorphic relationship
  belongs_to :schedulable, polymorphic: true

  # Created by (placeholder for API compatibility)
  belongs_to :created_by, serializer: PersonSerializer do |scheduled|
    nil
  end

  # Computed attributes from value object
  attribute :type_label do |scheduled|
    scheduled.scheduled_type_label
  end

  attribute :type_emoji do |scheduled|
    scheduled.scheduled_type_emoji
  end

  attribute :type_color do |scheduled|
    scheduled.scheduled_type_color
  end

  attribute :status_label do |scheduled|
    "Confirmed"
  end

  # DateTime attributes
  attribute :scheduled_at do |scheduled|
    if scheduled.scheduled_date && scheduled.scheduled_time
      Time.zone.parse("#{scheduled.scheduled_date} #{scheduled.scheduled_time}").iso8601
    elsif scheduled.scheduled_date
      scheduled.scheduled_date.to_time.in_time_zone.iso8601
    end
  end

  attribute :scheduled_end_at do |scheduled|
    if scheduled.scheduled_date && scheduled.scheduled_time
      start_time = Time.zone.parse("#{scheduled.scheduled_date} #{scheduled.scheduled_time}")
      (start_time + 60.minutes).iso8601
    elsif scheduled.scheduled_date
      (scheduled.scheduled_date.to_time.in_time_zone + 60.minutes).iso8601
    end
  end

  # Status flags
  attribute :is_past do |scheduled|
    scheduled.scheduled_date && scheduled.scheduled_date < Date.current
  end

  attribute :is_future do |scheduled|
    scheduled.scheduled_date && scheduled.scheduled_date > Date.current
  end

  attribute :is_today do |scheduled|
    scheduled.scheduled_date && scheduled.scheduled_date == Date.current
  end
end
