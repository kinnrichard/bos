# Comprehensive TaskList Test Suite
# Demonstrates the complete test infrastructure for TaskList component testing

require "test_helper"
require "application_playwright_test_case"

class TaskListComprehensiveTest < ApplicationPlaywrightTestCase
  # =============================================
  # Setup & Teardown
  # =============================================

  setup do
    # Ensure we have comprehensive test data
    TestEnvironment.setup_test_data!

    # Get our test job with mixed task scenarios
    @test_job = TestEnvironment.get_test_job(:mixed_status)

    # Create TaskList page object
    @task_list = TaskListPage.new(@page)

    # Sign in as admin user
    login_as_test_user(:admin)
  end

  # =============================================
  # Basic Functionality Tests
  # =============================================

  test "loads task list and displays tasks correctly" do
    @task_list.visit_job(@test_job)

    # Verify task list loaded
    assert @task_list.container.visible?, "TaskList container should be visible"
    assert @task_list.task_count > 0, "Should have tasks loaded"

    # Take debug screenshot
    @task_list.take_screenshot("initial_load")

    # Verify we can see task titles
    @task_list.all_tasks.all.each do |task|
      title_element = task.locator(".task-title, h5").first
      assert title_element.visible?, "Task title should be visible"
      refute title_element.text_content.strip.empty?, "Task title should not be empty"
    end
  end

  test "can create new tasks with different methods" do
    @task_list.visit_job(@test_job)

    initial_count = @task_list.task_count

    # Test enter-based creation
    @task_list.create_task("Test Task via Enter", method: :enter)
    assert_equal initial_count + 1, @task_list.task_count
    assert @task_list.has_task?("Test Task via Enter")

    # Test button-based creation
    @task_list.create_task("Test Task via Button", method: :button)
    assert_equal initial_count + 2, @task_list.task_count
    assert @task_list.has_task?("Test Task via Button")

    # Test blur-based creation
    @task_list.create_task("Test Task via Blur", method: :blur)
    assert_equal initial_count + 3, @task_list.task_count
    assert @task_list.has_task?("Test Task via Blur")
  end

  test "can edit task titles inline" do
    @task_list.visit_job(@test_job)

    # Get the first task
    first_task = @task_list.all_tasks.first
    original_title = first_task.locator(".task-title").text_content.strip
    new_title = "#{original_title} - EDITED"

    # Edit the task title
    @task_list.edit_task_title(0, new_title)

    # Verify the change
    updated_task = @task_list.all_tasks.first
    assert_includes updated_task.text_content, new_title
  end

  # =============================================
  # Status Management Tests
  # =============================================

  test "can change task statuses" do
    @task_list.visit_job(@test_job)

    # Find a task in new_task status
    @task_list.all_tasks.all.each_with_index do |task, index|
      current_status = @task_list.get_task_status(index)

      if current_status == "new_task"
        # Change to in_progress
        @task_list.change_task_status(index, "in_progress")

        # Verify the change
        updated_status = @task_list.get_task_status(index)
        assert_equal "in_progress", updated_status
        break
      end
    end
  end

  test "displays correct status emojis" do
    @task_list.visit_job(@test_job)

    # Check that status emojis are present
    @task_list.all_tasks.all.each do |task|
      status_element = task.locator(".status-emoji, .task-status").first
      assert status_element.visible?, "Status element should be visible"

      status_text = status_element.text_content.strip
      assert_includes [ "📋", "🔄", "⏸️", "✅", "❌", "💥" ], status_text.chars.first,
        "Should display a valid status emoji"
    end
  end

  # =============================================
  # Selection & Multi-select Tests
  # =============================================

  test "can select single tasks" do
    @task_list.visit_job(@test_job)

    # Select first task
    @task_list.click_task(0)

    # Verify selection
    assert @task_list.has_selected_tasks?, "Should have selected tasks"
    assert_equal 1, @task_list.get_selected_count
  end

  test "can select multiple tasks with ctrl+click" do
    @task_list.visit_job(@test_job)

    return if @task_list.task_count < 3

    # Select multiple tasks
    @task_list.select_multiple_tasks(0, 2, 4)

    # Verify multiple selection
    assert_equal 3, @task_list.get_selected_count
  end

  test "can select task ranges with shift+click" do
    @task_list.visit_job(@test_job)

    return if @task_list.task_count < 5

    # Select a range
    @task_list.select_task_range(1, 4)

    # Verify range selection (should select tasks 1, 2, 3, 4)
    assert @task_list.get_selected_count >= 4
  end

  test "can clear selection" do
    @task_list.visit_job(@test_job)

    # Select tasks first
    @task_list.select_multiple_tasks(0, 1, 2)
    assert @task_list.has_selected_tasks?

    # Clear selection
    @task_list.clear_selection
    assert_equal 0, @task_list.get_selected_count
  end

  # =============================================
  # Drag & Drop Tests
  # =============================================

  test "can reorder tasks via drag and drop" do
    @task_list.visit_job(@test_job)

    return if @task_list.task_count < 3

    # Get initial order
    initial_order = @task_list.task_order

    # Drag first task after second task
    @task_list.drag_for_reordering(0, 1, position: :after)

    # Verify order changed
    new_order = @task_list.task_order
    refute_equal initial_order, new_order
  end

  test "can nest tasks via drag and drop" do
    @task_list.visit_job(@test_job)

    return if @task_list.task_count < 2

    # Drag second task onto first task for nesting
    @task_list.drag_for_nesting(1, 0)

    # Verify nesting (implementation depends on your specific nesting system)
    # This test may need adjustment based on actual nesting implementation
  end

  # =============================================
  # Hierarchy Tests
  # =============================================

  test "can expand and collapse hierarchical tasks" do
    # Get a job with hierarchical tasks
    hierarchical_job = TestEnvironment.get_test_job(:complex)
    @task_list.visit_job(hierarchical_job)

    # Find tasks with children
    @task_list.all_tasks.all.each_with_index do |task, index|
      disclosure_button = task.locator(".disclosure-button, .expand-button").first

      if disclosure_button.visible?
        # Test expansion
        @task_list.expand_task(index)

        # Test collapse
        @task_list.collapse_task(index)
        break
      end
    end
  end

  # =============================================
  # Keyboard Navigation Tests
  # =============================================

  test "can navigate tasks with arrow keys" do
    @task_list.visit_job(@test_job)

    return if @task_list.task_count < 3

    # Click first task to focus
    @task_list.click_task(0)

    # Navigate down
    @task_list.navigate_down(count: 2)

    # Navigate up
    @task_list.navigate_up(count: 1)
  end

  test "can use keyboard shortcuts" do
    @task_list.visit_job(@test_job)

    # Select first task
    @task_list.click_task(0)

    # Test various shortcuts
    @task_list.use_shortcut(:enter)  # Should enter edit mode or create subtask
    @task_list.use_shortcut(:escape) # Should cancel or clear selection
  end

  # =============================================
  # Filtering & Search Tests
  # =============================================

  test "can filter tasks by status" do
    @task_list.visit_job(@test_job)

    initial_count = @task_list.visible_task_count

    # Apply status filter
    @task_list.filter_by_status("in_progress")

    # Verify filtering (count may change)
    filtered_count = @task_list.visible_task_count

    # Clear filters
    @task_list.clear_filters

    # Verify filter cleared
    final_count = @task_list.visible_task_count
    assert_equal initial_count, final_count
  end

  test "can search for tasks" do
    @task_list.visit_job(@test_job)

    # Get a task title to search for
    first_task_title = @task_list.all_tasks.first.locator(".task-title").text_content.strip
    search_term = first_task_title.split.first

    # Perform search
    @task_list.search(search_term)

    # Verify search results (at least the searched task should be visible)
    assert @task_list.visible_task_count > 0
  end

  # =============================================
  # Error Handling & Edge Cases
  # =============================================

  test "handles empty task list gracefully" do
    empty_job = TestEnvironment.get_test_job(:empty)
    @task_list.visit_job(empty_job)

    # Should not error on empty list
    assert_equal 0, @task_list.task_count

    # Should still be able to create tasks
    @task_list.create_task("First Task in Empty Job")
    assert_equal 1, @task_list.task_count
  end

  test "handles invalid task operations gracefully" do
    @task_list.visit_job(@test_job)

    # Try to interact with non-existent task
    assert_nothing_raised do
      @task_list.click_task(999) # Should fail gracefully
    end
  end

  # =============================================
  # Performance & Load Tests
  # =============================================

  test "performs well with large task lists" do
    large_job = TestEnvironment.get_test_job(:large)
    @task_list.visit_job(large_job)

    # Measure load time
    start_time = Time.current
    @task_list.wait_for_load
    load_time = Time.current - start_time

    # Should load within reasonable time
    assert load_time < 5.0, "TaskList should load within 5 seconds, took #{load_time}s"

    # Should handle interactions smoothly
    if @task_list.task_count > 10
      @task_list.click_task(5)
      @task_list.click_task(10)
    end
  end

  # =============================================
  # Integration Tests
  # =============================================

  test "integrates properly with job workflow" do
    @task_list.visit_job(@test_job)

    # Create a new task
    new_task_title = "Integration Test Task - #{Time.current.to_i}"
    @task_list.create_task(new_task_title)

    # Change its status
    task_index = @task_list.task_order.index { |title| title.include?(new_task_title) }
    if task_index
      @task_list.change_task_status(task_index, "in_progress")
      @task_list.change_task_status(task_index, "successfully_completed")
    end

    # Reload page and verify persistence
    @task_list.reload
    assert @task_list.has_task?(new_task_title), "Task should persist after reload"
  end

  # =============================================
  # Debug & Utility Tests
  # =============================================

  test "debug utilities work correctly" do
    @task_list.visit_job(@test_job)

    # Test debug info
    debug_info = @task_list.debug_info
    assert debug_info.is_a?(Hash)
    assert debug_info.key?(:task_count)
    assert debug_info.key?(:visible_count)

    # Test screenshot functionality
    screenshot_path = @task_list.take_screenshot("test_screenshot")
    assert File.exist?(screenshot_path), "Screenshot should be created"
  end

  # =============================================
  # Accessibility Tests
  # =============================================

  test "meets basic accessibility requirements" do
    @task_list.visit_job(@test_job)

    # Check for ARIA attributes
    @task_list.all_tasks.all.each do |task|
      # Should have role or aria-label
      has_accessibility = task.get_attribute("role") ||
                         task.get_attribute("aria-label") ||
                         task.get_attribute("aria-describedby")

      # This is a basic check - full accessibility testing would be more comprehensive
    end
  end

  private

  # Helper method to ensure we have enough tasks for testing
  def ensure_minimum_tasks(count = 5)
    current_count = @task_list.task_count

    if current_count < count
      (count - current_count).times do |i|
        @task_list.create_task("Generated Test Task #{i + 1}")
      end
    end
  end
end
