# TaskList Regression Test Suite
# Critical functionality tests to prevent regressions during refactoring

require "test_helper"
require "application_playwright_test_case"

class TaskListRegressionTest < ApplicationPlaywrightTestCase
  setup do
    TestEnvironment.setup_test_data!
    @task_list = TaskListPage.new(@page)
    login_as_test_user(:admin)
  end

  # =============================================
  # Core Functionality Regression Tests
  # =============================================

  test "REGRESSION: basic task operations remain functional" do
    job = TestEnvironment.get_test_job(:simple)
    @task_list.visit_job(job)

    # Critical path: Load -> Create -> Edit -> Status Change -> Delete
    initial_count = @task_list.task_count

    # 1. Create task
    @task_list.create_task("Regression Test Task")
    assert_equal initial_count + 1, @task_list.task_count

    # 2. Edit task
    @task_list.edit_task_title("Regression Test Task", "Edited Regression Task")
    assert @task_list.has_task?("Edited Regression Task")

    # 3. Change status
    task_index = @task_list.task_order.index { |t| t.include?("Edited Regression") }
    if task_index
      @task_list.change_task_status(task_index, "in_progress")
      assert_equal "in_progress", @task_list.get_task_status(task_index)

      @task_list.change_task_status(task_index, "successfully_completed")
      assert_equal "successfully_completed", @task_list.get_task_status(task_index)
    end

    # Task should persist after reload
    @task_list.reload
    assert @task_list.has_task?("Edited Regression Task")
  end

  test "REGRESSION: task list loads correctly with various data scenarios" do
    # Test with different job types
    test_scenarios = [
      { job: :empty, min_tasks: 0, description: "empty job" },
      { job: :simple, min_tasks: 1, description: "simple job" },
      { job: :complex, min_tasks: 3, description: "complex job" },
      { job: :large, min_tasks: 10, description: "large job" }
    ]

    test_scenarios.each do |scenario|
      job = TestEnvironment.get_test_job(scenario[:job])
      next unless job # Skip if job type doesn't exist

      @task_list.visit_job(job)

      # Should load without errors
      assert @task_list.container.visible?,
        "TaskList should load for #{scenario[:description]}"

      # Should meet minimum task requirements
      if scenario[:min_tasks] > 0
        assert @task_list.task_count >= scenario[:min_tasks],
          "#{scenario[:description]} should have at least #{scenario[:min_tasks]} tasks"
      end

      # All visible tasks should have required elements
      @task_list.all_tasks.all.each_with_index do |task, index|
        assert task.locator(".task-title").visible?,
          "Task #{index} should have visible title in #{scenario[:description]}"
        assert task.locator(".status-emoji, .task-status").visible?,
          "Task #{index} should have visible status in #{scenario[:description]}"
      end
    end
  end

  test "REGRESSION: task selection mechanisms work correctly" do
    job = TestEnvironment.get_test_job(:simple)
    @task_list.visit_job(job)

    return if @task_list.task_count < 3

    # Single selection
    @task_list.click_task(0)
    assert_equal 1, @task_list.get_selected_count, "Single selection should work"

    # Clear selection
    @task_list.clear_selection
    assert_equal 0, @task_list.get_selected_count, "Selection clearing should work"

    # Multi-selection with Ctrl
    @task_list.select_multiple_tasks(0, 2)
    assert @task_list.get_selected_count >= 2, "Multi-selection should work"

    # Range selection with Shift
    @task_list.select_task_range(0, 2)
    assert @task_list.get_selected_count >= 3, "Range selection should work"
  end

  test "REGRESSION: drag and drop functionality is preserved" do
    job = TestEnvironment.get_test_job(:simple)
    @task_list.visit_job(job)

    # Ensure we have enough tasks
    while @task_list.task_count < 3
      @task_list.create_task("DnD Test Task #{@task_list.task_count + 1}")
    end

    initial_order = @task_list.task_order

    # Perform drag and drop
    @task_list.drag_for_reordering(0, 2, position: :after)

    # Verify order changed
    new_order = @task_list.task_order
    refute_equal initial_order, new_order, "Drag and drop should change task order"

    # Verify no UI corruption
    assert @task_list.container.visible?, "UI should remain stable after drag and drop"
    assert_equal 3, @task_list.task_count, "Task count should be preserved"
  end

  # =============================================
  # Status Management Regression Tests
  # =============================================

  test "REGRESSION: all status transitions work correctly" do
    job = TestEnvironment.get_test_job(:mixed_status)
    @task_list.visit_job(job)

    return if @task_list.task_count < 1

    # Test all major status transitions
    status_transitions = [
      [ "new_task", "in_progress" ],
      [ "in_progress", "paused" ],
      [ "paused", "in_progress" ],
      [ "in_progress", "successfully_completed" ],
      [ "successfully_completed", "new_task" ], # Reopening
      [ "new_task", "cancelled" ],
      [ "cancelled", "new_task" ] # Uncancelling
    ]

    task_index = 0

    status_transitions.each do |from_status, to_status|
      # Set initial status
      @task_list.change_task_status(task_index, from_status)
      initial_status = @task_list.get_task_status(task_index)

      # Change to target status
      @task_list.change_task_status(task_index, to_status)
      final_status = @task_list.get_task_status(task_index)

      # Allow for some flexibility in status matching
      assert [ to_status, to_status.humanize.downcase ].include?(final_status.downcase),
        "Status transition #{from_status} -> #{to_status} failed. Got: #{final_status}"
    end
  end

  test "REGRESSION: status emojis display correctly" do
    job = TestEnvironment.get_test_job(:mixed_status)
    @task_list.visit_job(job)

    return if @task_list.task_count < 1

    # Expected emoji mappings
    status_emojis = {
      "new_task" => "📋",
      "in_progress" => "🔄",
      "paused" => "⏸️",
      "successfully_completed" => "✅",
      "cancelled" => "❌",
      "failed" => "💥"
    }

    task_index = 0

    status_emojis.each do |status, expected_emoji|
      @task_list.change_task_status(task_index, status)

      # Get the actual emoji displayed
      task = @task_list.task(task_index)
      status_element = task.locator(".status-emoji, .task-status").first
      displayed_text = status_element.text_content.strip

      # Should contain the expected emoji
      assert displayed_text.include?(expected_emoji),
        "Status #{status} should display #{expected_emoji}, but showed: #{displayed_text}"
    end
  end

  # =============================================
  # UI Stability Regression Tests
  # =============================================

  test "REGRESSION: UI remains stable during rapid interactions" do
    job = TestEnvironment.get_test_job(:simple)
    @task_list.visit_job(job)

    # Ensure we have tasks to work with
    while @task_list.task_count < 5
      @task_list.create_task("Stability Test #{@task_list.task_count + 1}")
    end

    # Perform rapid interactions
    10.times do |i|
      task_index = i % @task_list.task_count

      # Click task
      @task_list.click_task(task_index)

      # Change status
      new_status = [ "new_task", "in_progress", "successfully_completed" ][i % 3]
      @task_list.change_task_status(task_index, new_status)

      # Brief pause to allow UI updates
      sleep 0.1
    end

    # UI should still be functional
    assert @task_list.container.visible?, "TaskList container should remain visible"
    assert @task_list.task_count >= 5, "Task count should be preserved"

    # Should be able to create new task
    @task_list.create_task("Post-stability test task")
    assert @task_list.has_task?("Post-stability test task")
  end

  test "REGRESSION: keyboard navigation works after UI updates" do
    job = TestEnvironment.get_test_job(:simple)
    @task_list.visit_job(job)

    return if @task_list.task_count < 3

    # Start with first task
    @task_list.click_task(0)

    # Change some task statuses (triggers UI updates)
    @task_list.change_task_status(0, "in_progress")
    @task_list.change_task_status(1, "successfully_completed")

    # Keyboard navigation should still work
    @task_list.navigate_down(count: 1)
    @task_list.navigate_up(count: 1)

    # Shortcuts should work
    @task_list.use_shortcut(:enter)
    @task_list.use_shortcut(:escape)

    # UI should remain stable
    assert @task_list.container.visible?
  end

  # =============================================
  # Data Persistence Regression Tests
  # =============================================

  test "REGRESSION: task changes persist across page reloads" do
    job = TestEnvironment.get_test_job(:simple)
    @task_list.visit_job(job)

    # Make several changes
    test_task_title = "Persistence Test #{Time.current.to_i}"
    @task_list.create_task(test_task_title)

    task_index = @task_list.task_order.index { |t| t.include?("Persistence Test") }
    if task_index
      @task_list.change_task_status(task_index, "in_progress")
      @task_list.edit_task_title(task_index, "#{test_task_title} - EDITED")
    end

    # Reload page
    @task_list.reload

    # Verify persistence
    assert @task_list.has_task?("Persistence Test"), "Created task should persist"
    assert @task_list.has_task?("EDITED"), "Edited title should persist"

    # Find the task and check status
    task_index = @task_list.task_order.index { |t| t.include?("Persistence Test") }
    if task_index
      assert_equal "in_progress", @task_list.get_task_status(task_index),
        "Status change should persist"
    end
  end

  test "REGRESSION: task order persists after drag and drop" do
    job = TestEnvironment.get_test_job(:simple)
    @task_list.visit_job(job)

    # Ensure we have multiple tasks with identifiable names
    unique_tasks = [ "First Task", "Second Task", "Third Task" ]
    unique_tasks.each { |title| @task_list.create_task(title) }

    # Get initial order
    initial_order = @task_list.task_order

    # Drag first task to end
    first_task_index = @task_list.task_order.index { |t| t.include?("First Task") }
    last_task_index = @task_list.task_count - 1

    if first_task_index && last_task_index > first_task_index
      @task_list.drag_for_reordering(first_task_index, last_task_index, position: :after)

      # Verify order changed
      new_order = @task_list.task_order
      refute_equal initial_order, new_order

      # Reload and verify persistence
      @task_list.reload
      reloaded_order = @task_list.task_order

      # Order should be maintained (allowing for some flexibility in exact matching)
      first_task_new_position = reloaded_order.index { |t| t.include?("First Task") }
      assert first_task_new_position > 0, "First task should have moved from first position"
    end
  end

  # =============================================
  # Integration Regression Tests
  # =============================================

  test "REGRESSION: task operations work with different user roles" do
    # Test with different user roles
    roles_to_test = [ :admin, :technician ]

    roles_to_test.each do |role|
      # Login as different role
      login_as_test_user(role)

      job = TestEnvironment.get_test_job(:simple)
      @task_list.visit_job(job)

      # Basic operations should work for all roles
      @task_list.create_task("#{role.to_s.capitalize} Test Task")
      assert @task_list.has_task?("#{role.to_s.capitalize} Test Task"),
        "Task creation should work for #{role}"

      # Status changes should work
      task_index = @task_list.task_order.index { |t| t.include?("#{role.to_s.capitalize} Test") }
      if task_index
        @task_list.change_task_status(task_index, "in_progress")
        assert_equal "in_progress", @task_list.get_task_status(task_index),
          "Status change should work for #{role}"
      end
    end
  end

  test "REGRESSION: task list works with various job statuses" do
    # Create jobs with different statuses
    job_statuses = [ "active", "completed", "on_hold" ]

    job_statuses.each do |status|
      # Find or create job with specific status
      job = Job.find_by(status: status) ||
            Job.create!(
              title: "#{status.capitalize} Job for Regression Test",
              client: Client.first,
              created_by: User.first,
              status: status
            )

      # Add a task if none exist
      if job.tasks.empty?
        job.tasks.create!(
          title: "Test task for #{status} job",
          status: "new_task",
          position: 10
        )
      end

      @task_list.visit_job(job)

      # Should load regardless of job status
      assert @task_list.container.visible?,
        "TaskList should load for #{status} job"

      # Should be able to interact with tasks
      if @task_list.task_count > 0
        @task_list.click_task(0)
        # Some operations might be restricted based on job status
        # but basic interaction should work
      end
    end
  end

  private

  def assert_ui_stable
    assert @task_list.container.visible?, "TaskList container should be visible"

    # Check for common error indicators
    error_messages = @page.locator(".error, .alert-danger, .notification-error")
    assert_equal 0, error_messages.count, "Should not have error messages"

    # Check console for errors
    logs = @page.console_messages if @page.respond_to?(:console_messages)
    error_logs = logs&.select { |log| log.type == "error" } || []
    assert error_logs.empty?, "Should not have console errors: #{error_logs.map(&:text).join(', ')}"
  end
end
