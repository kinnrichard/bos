require "application_playwright_test_case"

class JobNewTaskPlaceholderTest < ApplicationPlaywrightTestCase
  def setup
    @owner = users(:owner)
    @client = clients(:acme)
  end

  test "new task placeholder is always visible on job view" do
    sign_in_as(@owner)

    # Create a job with no tasks
    empty_job = Job.create!(
      client: @client,
      title: "Empty Job Test",
      status: :open,
      priority: :normal,
      created_by: @owner
    )

    # Visit the job page
    visit "/clients/#{@client.id}/jobs/#{empty_job.id}"
    wait_for_navigation

    # Verify the empty tasks message is shown
    assert @page.locator(".empty-tasks").visible?
    assert_text "No tasks yet. Click below to add a task."

    # Verify the new task placeholder is visible
    new_task_placeholder = @page.locator(".new-task-wrapper .new-task")
    assert new_task_placeholder.visible?
    assert_equal "click->job#showNewTaskInput", new_task_placeholder.get_attribute("data-action")

    # Click the new task placeholder
    new_task_placeholder.click

    # The empty message should disappear
    assert !@page.locator(".empty-tasks").visible?

    # The new task input should be editable
    new_task_input = @page.locator(".new-task-wrapper .task-title[contenteditable='true']")
    assert new_task_input.visible?
    assert_equal "true", new_task_input.get_attribute("contenteditable")

    # Type a new task
    new_task_input.type("My first task")
    @page.keyboard.press("Enter")

    # Wait for the task to be created
    @page.wait_for_selector(".task-item:not(.new-task)", state: "visible")

    # Verify the task was created
    assert_text "My first task"

    # Verify the new task placeholder is still visible
    assert new_task_placeholder.visible?
  end

  test "new task placeholder remains visible with existing tasks" do
    sign_in_as(@owner)

    # Create a job with existing tasks
    job_with_tasks = Job.create!(
      client: @client,
      title: "Job with Tasks",
      status: :open,
      priority: :normal,
      created_by: @owner
    )

    # Add some tasks
    task1 = Task.create!(job: job_with_tasks, title: "First task", status: :new_task, position: 0)
    task2 = Task.create!(job: job_with_tasks, title: "Second task", status: :in_progress, position: 1)

    # Visit the job page
    visit "/clients/#{@client.id}/jobs/#{job_with_tasks.id}"
    wait_for_navigation

    # Verify tasks are displayed
    assert_equal 2, @page.locator(".task-item:not(.new-task)").count

    # Verify the new task placeholder is still visible
    new_task_placeholder = @page.locator(".new-task-wrapper .new-task")
    assert new_task_placeholder.visible?
    assert_equal "click->job#showNewTaskInput", new_task_placeholder.get_attribute("data-action")

    # Click the new task placeholder
    new_task_placeholder.click

    # Wait a bit for the input to become editable
    @page.wait_for_timeout(300)

    # The new task input should be editable
    new_task_input = @page.locator(".new-task-wrapper .task-title[contenteditable='true']")
    assert new_task_input.visible?
    assert_equal "true", new_task_input.get_attribute("contenteditable")

    # Type a new task
    new_task_input.type("Third task")
    @page.keyboard.press("Enter")

    # Wait for the new task to appear
    @page.wait_for_timeout(1000)

    # Verify we now have 3 tasks
    task_count = @page.locator(".task-item:not(.new-task)").count
    assert_equal 3, task_count, "Expected 3 tasks but found #{task_count}"

    # Verify the new task placeholder is still visible
    assert new_task_placeholder.visible?
  end

  test "keyboard shortcut Enter creates new task" do
    sign_in_as(@owner)

    job = Job.create!(
      client: @client,
      title: "Keyboard Test Job",
      status: :open,
      priority: :normal,
      created_by: @owner
    )

    # Visit the job page
    visit "/clients/#{@client.id}/jobs/#{job.id}"
    wait_for_navigation

    # Click somewhere on the page to ensure focus is on the job view (not in an input)
    @page.locator(".tasks-container").click
    @page.wait_for_timeout(100)

    # Press Enter to trigger new task creation
    @page.keyboard.press("Enter")

    # Wait for the new task input to appear
    @page.wait_for_timeout(500)

    # Check if the placeholder was clicked
    placeholder = @page.locator(".new-task-wrapper")
    assert placeholder.visible?, "New task placeholder should be visible"

    # The new task input should be active
    new_task_input = @page.locator(".new-task-wrapper .task-title")
    contenteditable = new_task_input.get_attribute("contenteditable")
    assert_equal "true", contenteditable, "Task title should be contenteditable but was: #{contenteditable}"

    # Type a task
    new_task_input.type("Task from keyboard")
    @page.keyboard.press("Enter")

    # Verify the task was created
    @page.wait_for_selector(".task-item:not(.new-task)", state: "visible")
    assert_text "Task from keyboard"
  end
end
