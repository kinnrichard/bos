require "test_helper"

class TaskReorderingTest < ActionDispatch::IntegrationTest
  setup do
    @client = clients(:acme)
    @job = jobs(:open_job)
    @user = users(:admin)

    # Clear existing tasks and create a clean set
    @job.tasks.destroy_all

    # Create root tasks
    @task1 = @job.tasks.create!(title: "Task 1", position: 1, status: "new_task")
    @task2 = @job.tasks.create!(title: "Task 2", position: 2, status: "in_progress")
    @task3 = @job.tasks.create!(title: "Task 3", position: 3, status: "new_task")

    # Create subtasks
    @subtask1 = @job.tasks.create!(title: "Subtask 1.1", parent: @task1, position: 1, status: "new_task")
    @subtask2 = @job.tasks.create!(title: "Subtask 1.2", parent: @task1, position: 2, status: "new_task")

    sign_in_as @user
  end

  test "single task reordering updates positions correctly" do
    # Move task3 to position 1
    patch reorder_client_job_task_path(@client, @job, @task3),
          params: { position: 1 },
          as: :json

    assert_response :success

    # Verify new positions
    assert_equal 2, @task1.reload.position
    assert_equal 3, @task2.reload.position
    assert_equal 1, @task3.reload.position

    # Verify response
    json = JSON.parse(response.body)
    assert_equal "success", json["status"]
    assert_not_nil json["timestamp"]
  end

  test "batch reordering handles multiple tasks" do
    # Reorder all tasks at once
    new_positions = [
      { id: @task2.id, position: 1 },
      { id: @task3.id, position: 2 },
      { id: @task1.id, position: 3 }
    ]

    patch reorder_client_job_tasks_path(@client, @job),
          params: { positions: new_positions },
          as: :json

    assert_response :success

    # Verify new order
    assert_equal 3, @task1.reload.position
    assert_equal 1, @task2.reload.position
    assert_equal 2, @task3.reload.position
  end

  test "concurrent reordering handles race conditions" do
    # Simulate two users reordering at the same time
    user2 = users(:technician)

    # User 1 starts reordering
    patch reorder_client_job_task_path(@client, @job, @task1),
          params: { position: 3 },
          as: :json

    assert_response :success

    # User 2 reorders different task (should work)
    sign_in_as user2
    patch reorder_client_job_task_path(@client, @job, @task2),
          params: { position: 1 },
          as: :json

    assert_response :success

    # Final positions should be consistent
    positions = @job.tasks.root_tasks.order(:position).pluck(:position)
    assert_equal [ 1, 2, 3 ], positions
  end

  test "moving task between parent and root level" do
    # Move subtask to root level
    patch client_job_task_path(@client, @job, @subtask1),
          params: {
            task: {
              parent_id: nil,
              position: 2
            }
          }

    assert_redirected_to client_job_path(@client, @job)

    # Verify it's now at root level
    @subtask1.reload
    assert_nil @subtask1.parent_id
    assert_equal 2, @subtask1.position

    # Verify other root tasks adjusted
    assert_equal 1, @task1.reload.position
    assert_equal 3, @task2.reload.position
    assert_equal 4, @task3.reload.position
  end

  test "moving task to different parent" do
    # Create another parent
    @task4 = @job.tasks.create!(title: "Task 4", position: 4, status: "new_task")

    # Move subtask1 from task1 to task4
    patch client_job_task_path(@client, @job, @subtask1),
          params: {
            task: {
              parent_id: @task4.id,
              position: 1
            }
          }

    assert_redirected_to client_job_path(@client, @job)

    # Verify move
    @subtask1.reload
    assert_equal @task4, @subtask1.parent
    assert_equal 1, @subtask1.position

    # Verify old parent's subtasks adjusted
    assert_equal 1, @subtask2.reload.position
  end

  test "status-based auto-reordering when enabled" do
    # Enable auto-reordering
    @user.update!(resort_tasks_on_status_change: true)

    # Change task3 to in_progress
    patch client_job_task_path(@client, @job, @task3),
          params: { task: { status: "in_progress" } }

    assert_redirected_to client_job_path(@client, @job)

    # Task3 should move before new tasks
    positions = @job.tasks.root_tasks.ordered_by_status.pluck(:id)
    assert_equal [ @task2.id, @task3.id, @task1.id ], positions
  end

  test "no auto-reordering when disabled" do
    # Disable auto-reordering
    @user.update!(resort_tasks_on_status_change: false)

    # Change task3 to in_progress
    patch client_job_task_path(@client, @job, @task3),
          params: { task: { status: "in_progress" } }

    assert_redirected_to client_job_path(@client, @job)

    # Positions should not change
    assert_equal 1, @task1.reload.position
    assert_equal 2, @task2.reload.position
    assert_equal 3, @task3.reload.position
  end

  test "turbo stream response updates UI correctly" do
    # Request turbo stream response
    patch reorder_client_job_task_path(@client, @job, @task3),
          params: { position: 1 },
          headers: { "Accept" => "text/vnd.turbo-stream.html" }

    assert_response :success
    assert_equal "text/vnd.turbo-stream.html; charset=utf-8", response.content_type

    # Verify turbo stream structure
    assert_match '<turbo-stream action="update" target="tasks-list">', response.body
    assert_match "<template>", response.body

    # Verify task order in rendered HTML
    assert_match /Task 3.*Task 1.*Task 2/m, response.body
  end

  test "invalid position handling" do
    # Try to move to invalid position
    patch reorder_client_job_task_path(@client, @job, @task1),
          params: { position: -1 },
          as: :json

    assert_response :success # acts_as_list handles this gracefully

    # Position should be 1 (minimum)
    assert_equal 1, @task1.reload.position
  end

  test "reordering non-existent task returns error" do
    patch reorder_client_job_task_path(@client, @job, 999999),
          params: { position: 1 },
          as: :json

    assert_response :not_found
  end

  test "reordering updates timestamps" do
    original_timestamp = @task1.reordered_at

    travel 1.minute do
      patch reorder_client_job_task_path(@client, @job, @task1),
            params: { position: 3 },
            as: :json

      assert_response :success
      assert_not_equal original_timestamp, @task1.reload.reordered_at
    end
  end

  test "complex hierarchy reordering" do
    # Create deeper hierarchy
    @subsubtask1 = @job.tasks.create!(
      title: "Sub-subtask 1.1.1",
      parent: @subtask1,
      position: 1,
      status: "new_task"
    )

    # Move entire branch by moving parent
    patch reorder_client_job_task_path(@client, @job, @task1),
          params: { position: 3 },
          as: :json

    assert_response :success

    # Verify parent moved
    assert_equal 3, @task1.reload.position

    # Verify children maintain their relative positions
    assert_equal @task1, @subtask1.reload.parent
    assert_equal @subtask1, @subsubtask1.reload.parent
  end

  test "drag and drop simulation with multiple steps" do
    # Simulate dragging task3 to position 1 with intermediate updates

    # Step 1: Start drag (no server call)
    # Step 2: Drag over position 2
    patch reorder_client_job_task_path(@client, @job, @task3),
          params: { position: 2 },
          as: :json

    assert_response :success
    assert_equal 2, @task3.reload.position

    # Step 3: Continue drag to position 1
    patch reorder_client_job_task_path(@client, @job, @task3),
          params: { position: 1 },
          as: :json

    assert_response :success
    assert_equal 1, @task3.reload.position

    # Final order should be consistent
    assert_equal [ 1, 2, 3 ], @job.tasks.root_tasks.order(:position).pluck(:position)
  end

  test "batch reorder with parent changes" do
    # Complex batch update changing both positions and parents
    updates = [
      { id: @subtask1.id, position: 3, parent_id: nil }, # Move to root
      { id: @task2.id, position: 1, parent_id: @task1.id }, # Move under task1
      { id: @task3.id, position: 1, parent_id: nil } # Stay root but move
    ]

    # Use TaskSortingService directly since controller doesn't handle parent changes in batch
    service = TaskSortingService.new(@job)
    service.sort_and_resolve_conflicts(updates.map { |u| u.merge(timestamp: Time.current) })

    # Verify complex reordering
    @subtask1.reload
    @task2.reload
    @task3.reload

    assert_nil @subtask1.parent_id
    assert_equal @task1, @task2.parent
    assert_equal 1, @task3.position
  end
end
