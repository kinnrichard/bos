require "test_helper"

class OptimisticLockingTest < ActionDispatch::IntegrationTest
  setup do
    @client = clients(:acme)
    @job = jobs(:open_job)
    @user1 = users(:admin)
    @user2 = users(:owner)

    # Clear existing tasks and create test tasks
    @job.tasks.destroy_all
    @task1 = @job.tasks.create!(title: "Task 1", position: 1, status: "new_task")
    @task2 = @job.tasks.create!(title: "Task 2", position: 2, status: "new_task")
    @task3 = @job.tasks.create!(title: "Task 3", position: 3, status: "new_task")
  end

  test "detects concurrent task reordering conflict" do
    # User 1 loads the page and gets lock versions
    sign_in_as @user1
    get client_job_path(@client, @job)
    assert_response :success

    # Get initial lock version
    initial_lock_version = @task1.reload.lock_version

    # User 2 reorders task 1 to position 3
    sign_in_as @user2
    patch reorder_client_job_task_path(@client, @job, @task1),
          params: { position: 3, lock_version: initial_lock_version },
          as: :json

    assert_response :success
    assert_equal 3, @task1.reload.position

    # Lock version should have incremented
    new_lock_version = @task1.reload.lock_version
    assert_not_equal initial_lock_version, new_lock_version

    # User 1 tries to reorder the same task with old lock version
    sign_in_as @user1
    patch reorder_client_job_task_path(@client, @job, @task1),
          params: { position: 2, lock_version: initial_lock_version },
          as: :json

    # Should get conflict response
    assert_response :conflict
    json = JSON.parse(response.body)
    assert json["conflict"]
    assert json["error"]
    assert json["current_state"]

    # Task position should not have changed
    assert_equal 3, @task1.reload.position
  end

  test "successfully reorders with correct lock version" do
    sign_in_as @user1

    # Get current lock version
    current_lock_version = @task2.reload.lock_version

    # Reorder with correct lock version
    patch reorder_client_job_task_path(@client, @job, @task2),
          params: { position: 1, lock_version: current_lock_version },
          as: :json

    assert_response :success
    assert_equal 1, @task2.reload.position

    # Response should include new lock version
    json = JSON.parse(response.body)
    assert json["lock_version"]
    assert_not_equal current_lock_version, json["lock_version"]
  end

  test "batch reorder detects job-level conflicts" do
    sign_in_as @user1

    # Get initial job lock version
    initial_job_lock_version = @job.reload.lock_version

    # User 2 makes a change to the job
    sign_in_as @user2
    @job.touch # This increments lock_version

    # User 1 tries batch reorder with old job lock version
    sign_in_as @user1
    patch reorder_client_job_tasks_path(@client, @job),
          params: {
            job_lock_version: initial_job_lock_version,
            positions: [
              { id: @task1.id, position: 3 },
              { id: @task2.id, position: 1 },
              { id: @task3.id, position: 2 }
            ]
          },
          as: :json

    # Should get conflict response
    assert_response :conflict
    json = JSON.parse(response.body)
    assert json["conflict"]

    # Positions should not have changed
    assert_equal 1, @task1.reload.position
    assert_equal 2, @task2.reload.position
    assert_equal 3, @task3.reload.position
  end

  test "handles missing lock version gracefully" do
    sign_in_as @user1

    # Reorder without lock version (legacy client)
    patch reorder_client_job_task_path(@client, @job, @task3),
          params: { position: 1 },
          as: :json

    # Should succeed (backward compatibility)
    assert_response :success
    assert_equal 1, @task3.reload.position
  end

  test "provides fresh state on conflict" do
    sign_in_as @user1

    # Get initial state
    initial_lock_version = @task1.reload.lock_version

    # Another user modifies the task
    sign_in_as @user2
    @task1.update!(title: "Modified Task 1")

    # First user tries to reorder with stale lock version
    sign_in_as @user1
    patch reorder_client_job_task_path(@client, @job, @task1),
          params: { position: 3, lock_version: initial_lock_version },
          as: :json

    assert_response :conflict
    json = JSON.parse(response.body)

    # Should include current state
    assert json["current_state"]["job_lock_version"]
    assert json["current_state"]["tasks"]

    # Find task 1 in the current state
    task1_state = json["current_state"]["tasks"].find { |t| t["id"] == @task1.id }
    assert_equal "Modified Task 1", task1_state["title"]
    assert task1_state["lock_version"]
  end

  test "turbo stream response on conflict refreshes UI" do
    sign_in_as @user1

    # Get initial lock version
    initial_lock_version = @task2.reload.lock_version

    # Another user modifies the task
    sign_in_as @user2
    @task2.insert_at(3)

    # First user tries to reorder with stale lock version and turbo stream
    sign_in_as @user1
    patch reorder_client_job_task_path(@client, @job, @task2),
          params: { position: 1, lock_version: initial_lock_version },
          headers: {
            "Accept" => "text/vnd.turbo-stream.html, text/html"
          }

    # Should get turbo stream response with updated UI (conflict handled gracefully)
    assert_response :success
    assert_equal "text/vnd.turbo-stream.html; charset=utf-8", response.content_type
    assert_match '<turbo-stream action="update"', response.body
  end

  test "transaction rollback on batch conflict" do
    sign_in_as @user1

    # Get lock versions
    task1_lock = @task1.reload.lock_version
    task2_lock = @task2.reload.lock_version
    task3_lock = @task3.reload.lock_version

    # User 2 modifies task 2
    sign_in_as @user2
    @task2.update!(title: "Changed")

    # User 1 tries batch update with one stale lock version
    sign_in_as @user1
    patch reorder_client_job_tasks_path(@client, @job),
          params: {
            positions: [
              { id: @task1.id, position: 3, lock_version: task1_lock },
              { id: @task2.id, position: 1, lock_version: task2_lock }, # This is stale
              { id: @task3.id, position: 2, lock_version: task3_lock }
            ]
          },
          as: :json

    # Should get conflict response
    assert_response :conflict

    # No tasks should have moved (transaction rolled back)
    assert_equal 1, @task1.reload.position
    assert_equal 2, @task2.reload.position
    assert_equal 3, @task3.reload.position
  end
end
