require "test_helper"

class ScheduledDateTimeSerializerTest < ActiveSupport::TestCase
  setup do
    @scheduled_date_time = scheduled_date_times(:one)
    @serializer = ScheduledDateTimeSerializer.new(@scheduled_date_time)
    @serialization = @serializer.serializable_hash
  end

  test "serializes scheduled date time with correct type" do
    assert_equal :scheduledDateTimes, @serialization[:data][:type]
  end

  test "serializes basic attributes" do
    attributes = @serialization[:data][:attributes]

    assert_equal @scheduled_date_time.scheduled_date, attributes[:scheduledDate]
    assert_equal @scheduled_date_time.scheduled_time, attributes[:scheduledTime]
    assert_equal 60, attributes[:durationMinutes] # Default duration
    assert_equal @scheduled_date_time.scheduled_type, attributes[:scheduleType]
    assert_equal "confirmed", attributes[:status]
  end

  test "serializes metadata" do
    attributes = @serialization[:data][:attributes]

    assert attributes.key?(:metadata)
    assert_equal({}, attributes[:metadata])
  end

  test "serializes computed attributes" do
    attributes = @serialization[:data][:attributes]

    assert attributes.key?(:scheduledAt)
    assert attributes.key?(:scheduledEndAt)
    assert attributes.key?(:isPast)
    assert attributes.key?(:isFuture)
    assert attributes.key?(:isToday)
    assert attributes.key?(:statusLabel)
  end

  test "computes scheduled times correctly" do
    # Set a specific date and time
    date = Date.today
    time = "14:30:00"
    duration = 60

    @scheduled_date_time.update!(
      scheduled_date: date,
      scheduled_time: time
    )

    serialization = ScheduledDateTimeSerializer.new(@scheduled_date_time).serializable_hash
    attributes = serialization[:data][:attributes]

    # Check scheduledAt combines date and time
    expected_start = Time.zone.parse("#{date} #{time}")
    assert_equal expected_start.iso8601, attributes[:scheduledAt]

    # Check scheduledEndAt adds duration
    expected_end = expected_start + duration.minutes
    assert_equal expected_end.iso8601, attributes[:scheduledEndAt]
  end

  test "computes time status flags correctly" do
    # Past schedule
    @scheduled_date_time.update!(scheduled_date: 1.day.ago.to_date)
    serialization = ScheduledDateTimeSerializer.new(@scheduled_date_time).serializable_hash
    attributes = serialization[:data][:attributes]

    assert attributes[:isPast]
    assert_not attributes[:isFuture]
    assert_not attributes[:isToday]

    # Future schedule
    @scheduled_date_time.update!(scheduled_date: 1.day.from_now.to_date)
    serialization = ScheduledDateTimeSerializer.new(@scheduled_date_time).serializable_hash
    attributes = serialization[:data][:attributes]

    assert_not attributes[:isPast]
    assert attributes[:isFuture]
    assert_not attributes[:isToday]

    # Today's schedule
    @scheduled_date_time.update!(scheduled_date: Date.today)
    serialization = ScheduledDateTimeSerializer.new(@scheduled_date_time).serializable_hash
    attributes = serialization[:data][:attributes]

    assert_not attributes[:isPast]
    assert_not attributes[:isFuture]
    assert attributes[:isToday]
  end

  test "includes relationships" do
    relationships = @serialization[:data][:relationships]

    assert relationships.key?(:schedulable)
    assert relationships.key?(:createdBy)
  end

  test "serializes polymorphic schedulable relationship" do
    # Schedule for a job
    job_schedule = scheduled_date_times(:one)
    serialization = ScheduledDateTimeSerializer.new(job_schedule).serializable_hash
    schedulable_rel = serialization[:data][:relationships][:schedulable]

    assert_equal :jobs, schedulable_rel[:data][:type]
    assert_equal job_schedule.schedulable_id.to_s, schedulable_rel[:data][:id]
  end

  test "transforms keys to camelCase" do
    attributes = @serialization[:data][:attributes]

    assert attributes.key?(:scheduledDate)
    assert attributes.key?(:scheduledTime)
    assert attributes.key?(:durationMinutes)
    assert attributes.key?(:scheduleType)
    assert attributes.key?(:scheduledAt)
    assert attributes.key?(:scheduledEndAt)
    assert attributes.key?(:isPast)
    assert attributes.key?(:isFuture)
    assert attributes.key?(:isToday)
    assert attributes.key?(:statusLabel)
    assert attributes.key?(:createdAt)
    assert attributes.key?(:updatedAt)

    attributes.keys.each do |key|
      assert_no_match /_/, key.to_s
    end
  end
end
