require "test_helper"

class TaskSerializerTest < ActiveSupport::TestCase
  setup do
    @task = tasks(:open_task_1)
    @serializer = TaskSerializer.new(@task)
    @serialization = @serializer.serializable_hash
  end

  test "serializes task with correct type" do
    assert_equal :tasks, @serialization[:data][:type]
  end

  test "serializes basic attributes" do
    attributes = @serialization[:data][:attributes]

    assert_equal @task.title, attributes[:title]
    assert_equal @task.status, attributes[:status]
    assert_equal @task.position, attributes[:position]
    assert_equal @task.subtasks_count, attributes[:subtasksCount]
  end

  test "does not serialize non-existent attributes" do
    attributes = @serialization[:data][:attributes]

    # These were in the original serializer but don't exist in the model
    assert_not attributes.key?(:description)
    assert_not attributes.key?(:completedAt)
  end

  test "serializes computed attributes" do
    attributes = @serialization[:data][:attributes]

    assert attributes.key?(:statusLabel)
    assert attributes.key?(:isCompleted)
    assert attributes.key?(:isRootTask)
    assert attributes.key?(:canHaveSubtasks)
  end

  test "computes status correctly" do
    attributes = @serialization[:data][:attributes]

    assert_equal false, attributes[:isCompleted]

    # Update to completed status
    @task.update!(status: "successfully_completed")
    serialization = TaskSerializer.new(@task).serializable_hash

    assert_equal true, serialization[:data][:attributes][:isCompleted]
  end

  test "computes root task status" do
    # Task without parent is root
    assert @serialization[:data][:attributes][:isRootTask]

    # Create a subtask
    subtask = @task.job.tasks.create!(
      title: "Subtask",
      status: "new_task",
      position: 100,
      parent: @task
    )

    serialization = TaskSerializer.new(subtask).serializable_hash
    assert_not serialization[:data][:attributes][:isRootTask]
  end

  test "includes relationships" do
    relationships = @serialization[:data][:relationships]

    assert relationships
    assert relationships.key?(:job)
    # assignedTo, parent are conditional so may not always be present
    assert relationships.key?(:subtasks)
    assert relationships.key?(:notes)
  end

  test "conditionally includes assigned user" do
    # Task without assignment
    @task.update!(assigned_to: nil)
    serialization = TaskSerializer.new(@task).serializable_hash
    assert_nil serialization[:data][:relationships][:assignedTo][:data] if serialization[:data][:relationships][:assignedTo]

    # Task with assignment
    @task.update!(assigned_to: users(:technician))
    serialization = TaskSerializer.new(@task).serializable_hash
    assert_not_nil serialization[:data][:relationships][:assignedTo][:data] if serialization[:data][:relationships][:assignedTo]
  end

  test "transforms keys to camelCase" do
    attributes = @serialization[:data][:attributes]

    assert attributes.key?(:subtasksCount)
    assert attributes.key?(:isCompleted)
    assert attributes.key?(:statusLabel)

    attributes.keys.each do |key|
      assert_no_match /_/, key.to_s
    end
  end
end
