require "test_helper"

class JobSerializerTest < ActiveSupport::TestCase
  setup do
    @job = jobs(:simple_website_job)
    @serializer = JobSerializer.new(@job)
    @serialization = @serializer.serializable_hash
  end

  test "serializes job with correct type" do
    assert_equal :jobs, @serialization[:data][:type]
  end

  test "serializes basic attributes" do
    attributes = @serialization[:data][:attributes]

    assert_equal @job.title, attributes[:title]
    assert_equal @job.description, attributes[:description]
    assert_equal @job.status, attributes[:status]
    assert_equal @job.priority, attributes[:priority]
  end

  test "serializes timestamps in ISO format" do
    attributes = @serialization[:data][:attributes]

    assert_match /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, attributes[:createdAt]
    assert_match /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, attributes[:updatedAt]
  end

  test "serializes date and time attributes" do
    attributes = @serialization[:data][:attributes]

    assert_equal @job.due_at, attributes[:dueAt]
    assert_equal @job.due_time_set, attributes[:dueTimeSet]
    assert_equal @job.starts_at, attributes[:startsAt]
    assert_equal @job.start_time_set, attributes[:startTimeSet]
  end

  test "serializes computed attributes" do
    attributes = @serialization[:data][:attributes]

    assert attributes.key?(:statusLabel)
    assert attributes.key?(:priorityLabel)
    assert attributes.key?(:isOverdue)
    assert attributes.key?(:taskCounts)
  end

  test "serializes task counts correctly" do
    # Clear existing tasks first
    @job.tasks.destroy_all

    # Create some tasks with different statuses
    @job.tasks.create!(title: "New task", status: "new_task", position: 1)
    @job.tasks.create!(title: "In progress", status: "in_progress", position: 2)
    @job.tasks.create!(title: "Completed", status: "successfully_completed", position: 3)

    serialization = JobSerializer.new(@job).serializable_hash
    task_counts = serialization[:data][:attributes][:taskCounts]

    # Task counts is a nested hash
    assert_equal 3, task_counts[:total]
    assert_equal 1, task_counts[:completed]
    assert_equal 1, task_counts[:pending]
    assert_equal 1, task_counts[:inProgress] || task_counts[:in_progress]
  end

  test "calculates overdue status correctly" do
    # Set job as overdue
    @job.update!(due_at: 1.day.ago.to_datetime.change(hour: 17), due_time_set: true)

    serialization = JobSerializer.new(@job).serializable_hash
    assert serialization[:data][:attributes][:isOverdue]

    # Completed jobs should not be overdue
    @job.update!(status: "successfully_completed")
    serialization = JobSerializer.new(@job).serializable_hash
    assert_not serialization[:data][:attributes][:isOverdue]
  end

  test "includes relationships" do
    relationships = @serialization[:data][:relationships]

    assert relationships.key?(:client)
    assert relationships.key?(:createdBy)
    assert relationships.key?(:technicians)
    assert relationships.key?(:tasks)
    assert relationships.key?(:notes)
  end

  test "transforms keys to camelCase" do
    attributes = @serialization[:data][:attributes]

    # Check that snake_case keys are transformed
    assert attributes.key?(:createdAt)
    assert attributes.key?(:statusLabel)
    assert attributes.key?(:isOverdue)

    # Ensure no snake_case keys remain
    attributes.keys.each do |key|
      assert_no_match /_/, key.to_s
    end
  end
end
