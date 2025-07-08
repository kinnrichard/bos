require "application_playwright_test_case"

class JobSequentialTaskCreationTest < ApplicationPlaywrightTestCase
  def setup
    @owner = users(:owner)
    @client = clients(:acme)
  end

  test "can add multiple tasks sequentially without refreshing" do
    sign_in_as(@owner)

    # Create a job with no tasks
    job = Job.create!(
      client: @client,
      title: "Sequential Task Test",
      status: :open,
      priority: :normal,
      created_by: @owner
    )

    # Visit the job page
    visit "/clients/#{@client.id}/jobs/#{job.id}"
    wait_for_navigation

    # Add first task
    new_task_placeholder = @page.locator(".new-task-wrapper .new-task")
    assert new_task_placeholder.visible?
    new_task_placeholder.click

    new_task_input = @page.locator(".new-task-wrapper .task-title[contenteditable='true']")
    assert new_task_input.visible?
    new_task_input.type("First task")
    @page.keyboard.press("Enter")

    # Wait for first task to be created
    @page.wait_for_selector(".task-item:not(.new-task)", state: "visible")
    assert_text "First task"

    # Verify placeholder is reset and clickable again
    new_task_placeholder = @page.locator(".new-task-wrapper .new-task")
    assert new_task_placeholder.visible?

    # Add second task without refreshing
    new_task_placeholder.click

    new_task_input = @page.locator(".new-task-wrapper .task-title[contenteditable='true']")
    assert new_task_input.visible?
    new_task_input.type("Second task")
    @page.keyboard.press("Enter")

    # Wait for second task to be created
    @page.wait_for_timeout(1000)
    assert_text "Second task"

    # Verify we have 2 tasks
    assert_equal 2, @page.locator(".task-item:not(.new-task)").count

    # Add third task to be thorough
    new_task_placeholder = @page.locator(".new-task-wrapper .new-task")
    new_task_placeholder.click

    new_task_input = @page.locator(".new-task-wrapper .task-title[contenteditable='true']")
    new_task_input.type("Third task")
    @page.keyboard.press("Enter")

    @page.wait_for_timeout(1000)
    assert_text "Third task"

    # Verify we have 3 tasks
    assert_equal 3, @page.locator(".task-item:not(.new-task)").count
  end

  test "placeholder resets properly after canceling with Escape" do
    sign_in_as(@owner)

    job = Job.create!(
      client: @client,
      title: "Cancel Test Job",
      status: :open,
      priority: :normal,
      created_by: @owner
    )

    visit "/clients/#{@client.id}/jobs/#{job.id}"
    wait_for_navigation

    # Click placeholder
    new_task_placeholder = @page.locator(".new-task-wrapper .new-task")
    new_task_placeholder.click

    # Type something but then cancel with Escape
    new_task_input = @page.locator(".new-task-wrapper .task-title[contenteditable='true']")
    new_task_input.type("This will be canceled")
    @page.keyboard.press("Escape")

    # Verify placeholder is back to normal state
    @page.wait_for_timeout(300)
    assert !new_task_input.visible?

    # Verify we can click it again
    new_task_placeholder.click
    assert new_task_input.visible?

    # Create a task to verify it still works
    new_task_input.type("Task after cancel")
    @page.keyboard.press("Enter")

    @page.wait_for_selector(".task-item:not(.new-task)", state: "visible")
    assert_text "Task after cancel"
  end
end
