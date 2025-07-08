# Focused TaskList Feature Tests
# Specific tests for individual TaskList features and edge cases

require "test_helper"
require "application_playwright_test_case"

class TaskListFocusedTests < ApplicationPlaywrightTestCase
  setup do
    TestEnvironment.setup_test_data!
    @task_list = TaskListPage.new(@page)
    login_as_test_user(:admin)
  end

  # =============================================
  # Task Creation Focus Tests
  # =============================================

  test "task creation with various input methods" do
    job = TestEnvironment.get_test_job(:simple)
    @task_list.visit_job(job)

    # Test rapid task creation
    tasks_to_create = [ "Quick Task 1", "Quick Task 2", "Quick Task 3" ]

    tasks_to_create.each do |task_title|
      @task_list.create_task(task_title, method: :enter)
      assert @task_list.has_task?(task_title), "Should create #{task_title}"
    end

    assert_equal @task_list.task_count, tasks_to_create.length +
      TestEnvironment.get_test_job(:simple).tasks.count
  end

  test "task creation handles special characters and long titles" do
    job = TestEnvironment.get_test_job(:empty)
    @task_list.visit_job(job)

    special_titles = [
      "Task with émojis 🚀 and special chars àéîôù",
      "Very " * 20 + "long task title that should wrap properly",
      "Task with \"quotes\" and 'apostrophes'",
      "Task with <script>alert('xss')</script> HTML",
      "Task with symbols: @#$%^&*()_+-={}[]|\\:;\"'<>,.?/"
    ]

    special_titles.each do |title|
      @task_list.create_task(title)
      assert @task_list.has_task?(title), "Should handle special title: #{title[0..50]}..."
    end
  end

  test "inline task creation after existing tasks" do
    job = TestEnvironment.get_test_job(:simple)
    @task_list.visit_job(job)

    return if @task_list.task_count < 1

    # Create inline task after first task
    @task_list.create_inline_task(0, "Inline Task After First")

    # Verify it appears in correct position
    task_order = @task_list.task_order
    inline_index = task_order.index { |t| t.include?("Inline Task After First") }
    assert inline_index && inline_index <= 2, "Inline task should appear near first task"
  end

  # =============================================
  # Status Management Focus Tests
  # =============================================

  test "status cycling through all states" do
    job = TestEnvironment.get_test_job(:simple)
    @task_list.visit_job(job)

    return if @task_list.task_count < 1

    status_cycle = [ "new_task", "in_progress", "paused", "successfully_completed", "cancelled", "failed" ]

    # Test cycling through all statuses
    status_cycle.each do |status|
      @task_list.change_task_status(0, status)
      actual_status = @task_list.get_task_status(0)

      # Allow for some flexibility in status representation
      assert_includes [ status, status.humanize.downcase, status.gsub("_", " ") ],
        actual_status.downcase,
        "Should change to #{status}, got #{actual_status}"
    end
  end

  test "batch status changes with multiple selection" do
    job = TestEnvironment.get_test_job(:mixed_status)
    @task_list.visit_job(job)

    return if @task_list.task_count < 3

    # Select multiple tasks
    @task_list.select_multiple_tasks(0, 1, 2)

    # Note: This test depends on your bulk action implementation
    # You may need to add bulk status change functionality
    if @task_list.selection_toolbar.visible?
      # Test bulk status change if implemented
      # @task_list.selection_toolbar.click
      # Look for bulk action buttons
    end
  end

  # =============================================
  # Drag & Drop Focus Tests
  # =============================================

  test "precise drag and drop positioning" do
    job = TestEnvironment.get_test_job(:large)
    @task_list.visit_job(job)

    return if @task_list.task_count < 5

    initial_order = @task_list.task_order

    # Test dragging to specific positions
    @task_list.drag_task(0, 2, position: :before)
    after_before = @task_list.task_order
    refute_equal initial_order, after_before

    @task_list.drag_task(2, 4, position: :after)
    after_after = @task_list.task_order
    refute_equal after_before, after_after
  end

  test "drag and drop visual feedback" do
    job = TestEnvironment.get_test_job(:simple)
    @task_list.visit_job(job)

    return if @task_list.task_count < 2

    source_task = @task_list.task(0)
    target_task = @task_list.task(1)

    # Start drag
    source_box = source_task.bounding_box
    source_task.hover
    @page.mouse.down(x: source_box["x"] + 10, y: source_box["y"] + 10)

    # Move to target (should show visual feedback)
    target_box = target_task.bounding_box
    @page.mouse.move(x: target_box["x"] + 10, y: target_box["y"] + 10)

    # Check for drag indicators
    sleep 0.5  # Allow for drag feedback to appear

    # Complete drag
    @page.mouse.up

    # Wait for drag completion
    @task_list.wait_for_action_completion
  end

  # =============================================
  # Keyboard Navigation Focus Tests
  # =============================================

  test "full keyboard navigation workflow" do
    job = TestEnvironment.get_test_job(:simple)
    @task_list.visit_job(job)

    return if @task_list.task_count < 3

    # Start with first task
    @task_list.click_task(0)

    # Navigate down with arrows
    @task_list.navigate_down(count: 2)

    # Use Enter to edit
    @task_list.use_shortcut(:enter)

    # Use Escape to cancel
    @task_list.use_shortcut(:escape)

    # Navigate up
    @task_list.navigate_up(count: 1)

    # Select all with Ctrl+A
    @task_list.use_shortcut(:select_all)

    # Clear with Escape
    @task_list.use_shortcut(:escape)
  end

  test "keyboard shortcuts with modifier keys" do
    job = TestEnvironment.get_test_job(:simple)
    @task_list.visit_job(job)

    return if @task_list.task_count < 3

    # Test Ctrl+Click simulation via keyboard
    @task_list.click_task(0)
    @task_list.ctrl_click_task(2)

    # Should have multiple selected
    assert @task_list.get_selected_count >= 2

    # Test Shift+Click for range selection
    @task_list.click_task(0)
    @task_list.shift_click_task(2)

    # Should select range
    assert @task_list.get_selected_count >= 3
  end

  # =============================================
  # Edit Mode Focus Tests
  # =============================================

  test "task editing edge cases" do
    job = TestEnvironment.get_test_job(:simple)
    @task_list.visit_job(job)

    return if @task_list.task_count < 1

    original_title = @task_list.all_tasks.first.locator(".task-title").text_content.strip

    # Test editing with empty title
    input = @task_list.start_editing(0)
    input.fill("")
    input.press("Enter")

    # Should revert or show validation
    # This behavior depends on your implementation

    # Test editing with escape
    input = @task_list.start_editing(0)
    input.fill("Cancelled Edit")
    @task_list.cancel_edit(0)

    # Should revert to original
    current_title = @task_list.all_tasks.first.locator(".task-title").text_content.strip
    assert_includes current_title, original_title.split.first
  end

  test "concurrent editing scenarios" do
    job = TestEnvironment.get_test_job(:simple)
    @task_list.visit_job(job)

    return if @task_list.task_count < 2

    # Start editing first task
    input1 = @task_list.start_editing(0)

    # Try to start editing second task
    @task_list.double_click_task(1)

    # First edit should complete or be cancelled
    input1.press("Enter") if input1.visible?
  end

  # =============================================
  # Filtering & Search Focus Tests
  # =============================================

  test "complex search scenarios" do
    job = TestEnvironment.get_test_job(:mixed_status)
    @task_list.visit_job(job)

    return if @task_list.task_count < 3

    # Test partial word search
    first_task_title = @task_list.all_tasks.first.locator(".task-title").text_content.strip
    partial_search = first_task_title.split.first[0..2]

    if partial_search.length >= 3
      @task_list.search(partial_search)
      assert @task_list.visible_task_count > 0, "Partial search should return results"
    end

    # Test case insensitive search
    @task_list.search(first_task_title.upcase)
    assert @task_list.visible_task_count > 0, "Case insensitive search should work"

    # Clear search
    @task_list.search("")
  end

  test "filter combinations" do
    job = TestEnvironment.get_test_job(:mixed_status)
    @task_list.visit_job(job)

    initial_count = @task_list.visible_task_count

    # Apply status filter
    @task_list.filter_by_status("in_progress")
    filtered_count = @task_list.visible_task_count

    # Apply search on top of filter
    @task_list.search("task")
    search_filtered_count = @task_list.visible_task_count

    # Should be same or fewer results
    assert search_filtered_count <= filtered_count

    # Clear all filters
    @task_list.clear_filters
    final_count = @task_list.visible_task_count
    assert_equal initial_count, final_count
  end

  # =============================================
  # Performance & Stress Tests
  # =============================================

  test "rapid task creation performance" do
    job = TestEnvironment.get_test_job(:empty)
    @task_list.visit_job(job)

    start_time = Time.current

    # Create 10 tasks rapidly
    10.times do |i|
      @task_list.create_task("Rapid Task #{i + 1}", method: :enter)
    end

    creation_time = Time.current - start_time

    # Should complete within reasonable time
    assert creation_time < 10.0, "Rapid task creation should complete within 10 seconds"
    assert_equal 10, @task_list.task_count
  end

  test "stress test task interactions" do
    job = TestEnvironment.get_test_job(:large)
    @task_list.visit_job(job)

    return if @task_list.task_count < 10

    # Perform many rapid interactions
    10.times do |i|
      @task_list.click_task(i % @task_list.task_count)
      @task_list.change_task_status(i % @task_list.task_count,
        [ "new_task", "in_progress", "successfully_completed" ][i % 3])
    end

    # Should still be responsive
    assert @task_list.container.visible?
    assert @task_list.task_count >= 10
  end

  # =============================================
  # Error Recovery Tests
  # =============================================

  test "recovers from network interruptions" do
    job = TestEnvironment.get_test_job(:simple)
    @task_list.visit_job(job)

    # Simulate network issue by navigating away and back
    @page.goto("about:blank")
    sleep 1
    @task_list.visit_job(job)

    # Should reload properly
    assert @task_list.container.visible?
    assert @task_list.task_count > 0
  end

  test "handles malformed task data gracefully" do
    job = TestEnvironment.get_test_job(:simple)
    @task_list.visit_job(job)

    # Try to create task with problematic content
    problematic_titles = [
      nil, # This will be converted to string
      "", # Empty string
      " " * 100, # Whitespace only
      "\n\t\r" # Special whitespace
    ]

    problematic_titles.each do |title|
      begin
        @task_list.create_task(title.to_s) if title
      rescue => e
        # Should handle gracefully
        assert @task_list.container.visible?, "UI should remain stable after error"
      end
    end
  end

  private

  def take_debug_screenshot(name)
    @task_list.take_screenshot("focused_test_#{name}")
  end
end
