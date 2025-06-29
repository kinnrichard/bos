require "test_helper"

class JobChannelTest < ActionCable::Channel::TestCase
  setup do
    @user = users(:technician)
    @job = jobs(:open_job)
    @job.technicians << @user

    stub_connection current_user: @user
  end

  test "subscribes to specific job" do
    subscribe job_id: @job.id

    assert subscription.confirmed?
    assert_has_stream "job_#{@job.id}"
    assert_has_stream "job_#{@job.id}_tasks"
  end

  test "rejects subscription to unauthorized job" do
    other_job = jobs(:urgent_job)
    other_job.technicians.clear

    subscribe job_id: other_job.id

    assert subscription.rejected?
  end

  test "subscribes to all user jobs" do
    subscribe

    assert subscription.confirmed?
    assert_has_stream "user_#{@user.id}_jobs"
  end

  test "reorders tasks" do
    subscribe job_id: @job.id

    # Use existing tasks from fixtures, they already have positions
    task_ids = @job.tasks.order(:position).pluck(:id)

    # Shuffle to simulate reordering
    shuffled_ids = task_ids.shuffle

    perform :reorder_tasks, job_id: @job.id, task_ids: shuffled_ids

    assert_broadcast_on("job_#{@job.id}_tasks", {
      type: "tasks_reordered",
      job_id: @job.id,
      task_ids: shuffled_ids,
      updated_by: @user.id
    })

    # Verify positions were updated to sequential order starting from 0
    shuffled_ids.each_with_index do |task_id, index|
      task = Task.find(task_id)
      assert_equal index, task.position, "Task #{task_id} should have position #{index} but has #{task.position}"
    end
  end

  test "updates job status" do
    subscribe job_id: @job.id

    perform :update_status, job_id: @job.id, status: "successfully_completed"

    @job.reload

    assert_broadcast_on("job_#{@job.id}", {
      type: "status_updated",
      job_id: @job.id,
      status: "successfully_completed",
      updated_by: @user.id,
      updated_at: @job.updated_at
    })

    assert_equal "successfully_completed", @job.status
  end

  test "handles invalid status update" do
    subscribe job_id: @job.id

    # Pass an invalid status value (numeric value outside enum)
    perform :update_status, job_id: @job.id, status: 99

    assert_no_broadcasts("job_#{@job.id}")
  end
end
