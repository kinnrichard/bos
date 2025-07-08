ENV["SKIP_FIXTURES"] = "true"
require_relative "../test_helper"
require_relative "../application_playwright_test_case"

class MultiDragGapEliminationTest < ApplicationPlaywrightTestCase
  setup do
    # Create test data
    @user = User.create!(
      name: "Test User",
      email: "test@example.com",
      password: "secret123",
      role: "admin"
    )

    @client = Client.create!(
      name: "Test Client",
      client_type: "residential"
    )

    @job = Job.create!(
      client: @client,
      title: "Multi-Drag Gap Test Job",
      status: "open",
      priority: "normal",
      created_by: @user
    )

    # Create a scenario similar to the bug report:
    # Multiple tasks in same parent, some will be moved to create gaps
    @task1 = Task.create!(job: @job, title: "Task 1 (staying)", position: 1, status: "new_task")
    @task2 = Task.create!(job: @job, title: "Task 2 (moving)", position: 2, status: "new_task")
    @task3 = Task.create!(job: @job, title: "Task 3 (staying)", position: 3, status: "new_task")
    @task4 = Task.create!(job: @job, title: "Task 4 (affected by gaps)", position: 4, status: "new_task")
    @task5 = Task.create!(job: @job, title: "Task 5 (moving)", position: 5, status: "new_task")
    @task6 = Task.create!(job: @job, title: "Task 6 (moving)", position: 6, status: "new_task")
    @task7 = Task.create!(job: @job, title: "Task 7 (staying)", position: 7, status: "new_task")

    # Create a destination parent task for nesting
    @parent_task = Task.create!(job: @job, title: "Parent Task (destination)", position: 8, status: "new_task")

    sign_in_as(@user)
  end

  test "multi-drag gap elimination produces correct positions" do
    # Navigate to job page
    visit "/clients/#{@client.id}/jobs/#{@job.id}"
    sleep 1 # Wait for page to load

    # Ensure CSRF token is present
    @page.evaluate(<<~JS)
      if (!document.querySelector('meta[name="csrf-token"]')) {
        const meta = document.createElement('meta');
        meta.name = 'csrf-token';
        meta.content = 'test-token';
        document.head.appendChild(meta);
      }
    JS

    # Get initial positions for verification
    initial_positions = @page.evaluate(<<~JS)
      Array.from(document.querySelectorAll('.task-item[data-task-id]')).map(el => ({
        id: el.dataset.taskId,
        title: el.querySelector('.task-title').textContent,
        position: parseInt(el.dataset.position) || 0
      }))
    JS

    puts "Initial task positions:"
    initial_positions.each { |task| puts "  #{task['title']}: #{task['position']}" }

    # Simulate multi-select drag of tasks 2, 5, and 6 (creating gaps at positions 2, 5, 6)
    # Task 4 should be affected by gap elimination and end up at position 2 (not 1)

    # First, enable multi-select by selecting multiple tasks
    task2_element = @page.locator(".task-item[data-task-id='#{@task2.id}']")
    task5_element = @page.locator(".task-item[data-task-id='#{@task5.id}']")
    task6_element = @page.locator(".task-item[data-task-id='#{@task6.id}']")
    parent_element = @page.locator(".task-item[data-task-id='#{@parent_task.id}']")

    # Click first task with Ctrl to start multi-select
    task2_element.click(modifiers: [ "Meta" ])
    sleep 0.1

    # Add more tasks to selection
    task5_element.click(modifiers: [ "Meta" ])
    sleep 0.1
    task6_element.click(modifiers: [ "Meta" ])
    sleep 0.1

    # Verify selection
    selected_count = @page.evaluate("document.querySelectorAll('.task-item.selected').length")
    assert_equal 3, selected_count, "Should have 3 tasks selected"

    # Drag one of the selected tasks to the parent task to nest all selected
    result = drag_and_drop(task2_element, parent_element, position: :center)
    puts "Multi-drag nesting result: #{result.inspect}"

    # Wait for server update
    sleep 1

    # Get final positions
    final_positions = @page.evaluate(<<~JS)
      Array.from(document.querySelectorAll('.task-item[data-task-id]')).map(el => ({
        id: el.dataset.taskId,
        title: el.querySelector('.task-title').textContent,
        position: parseInt(el.dataset.position) || 0,
        parent_id: el.dataset.parentId || null
      }))
    JS

    puts "Final task positions after multi-drag:"
    final_positions.each { |task| puts "  #{task['title']}: pos=#{task['position']}, parent=#{task['parent_id']}" }

    # Verify that Task 4 (originally at position 4) is now at position 2
    # This tests that gap elimination was applied correctly (not multiple times)
    task4_final = final_positions.find { |t| t["id"] == @task4.id }
    assert_not_nil task4_final, "Task 4 should exist in final positions"

    # The key test: Task 4 should be at position 2, not 1
    # With correct gap elimination: gaps at 2,5,6 → Task 4 (pos 4) shifts down by 1 → position 3
    # Wait, let me recalculate: after tasks 2,5,6 leave, remaining are 1,3,4,7
    # With proper gap elimination: 1→1, 3→2, 4→3, 7→4
    assert_equal 3, task4_final["position"], "Task 4 should be at position 3 after proper gap elimination"

    # Verify that the moved tasks are now children of the parent task
    moved_tasks = final_positions.select { |t| [ @task2.id, @task5.id, @task6.id ].include?(t["id"]) }
    moved_tasks.each do |task|
      assert_equal @parent_task.id, task["parent_id"], "#{task['title']} should be child of parent task"
    end

    puts "✅ Multi-drag gap elimination test passed!"
  end

  private

  def sign_in_as(user)
    visit "/login"
    fill_in "#email", with: user.email
    fill_in "#password", with: "secret123"
    click_on "Sign In"
    wait_for_navigation
  end

  def drag_and_drop(source, target, position: :after)
    # Convert locators to element handles
    source_handle = source.element_handle
    target_handle = target.element_handle

    @page.evaluate(<<~JS, arg: [ source_handle, target_handle, position.to_s ])
      async ([sourceElement, targetElement, position]) => {
        console.log('Starting drag and drop operation:', position);
      #{'  '}
        // For center position (nesting), simulate drag to center of target
        if (position === 'center') {
          const targetRect = targetElement.getBoundingClientRect();
          const centerX = targetRect.left + targetRect.width / 2;
          const centerY = targetRect.top + targetRect.height / 2;
      #{'    '}
          // Create a proper drag event sequence
          const dataTransfer = new DataTransfer();
          dataTransfer.effectAllowed = 'move';
      #{'    '}
          // Drag start
          const dragStart = new DragEvent('dragstart', {
            bubbles: true,
            cancelable: true,
            dataTransfer: dataTransfer
          });
          sourceElement.dispatchEvent(dragStart);
      #{'    '}
          await new Promise(resolve => setTimeout(resolve, 100));
      #{'    '}
          // Drag over target center#{'  '}
          const dragOver = new DragEvent('dragover', {
            bubbles: true,
            cancelable: true,
            dataTransfer: dataTransfer,
            clientX: centerX,
            clientY: centerY
          });
          targetElement.dispatchEvent(dragOver);
      #{'    '}
          await new Promise(resolve => setTimeout(resolve, 100));
      #{'    '}
          // Drop on target center
          const drop = new DragEvent('drop', {
            bubbles: true,
            cancelable: true,#{' '}
            dataTransfer: dataTransfer,
            clientX: centerX,
            clientY: centerY
          });
          targetElement.dispatchEvent(drop);
      #{'    '}
          // Drag end
          const dragEnd = new DragEvent('dragend', {
            bubbles: true,
            cancelable: true,
            dataTransfer: dataTransfer
          });
          sourceElement.dispatchEvent(dragEnd);
      #{'    '}
          console.log('Nesting drag completed');
          return { type: 'nest', centerX, centerY };
        }
      #{'  '}
        return { type: 'reorder' };
      }
    JS
  end
end
