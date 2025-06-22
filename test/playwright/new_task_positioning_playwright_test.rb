ENV["SKIP_FIXTURES"] = "true"
require_relative "../test_helper"
require_relative "../application_playwright_test_case"

class NewTaskPositioningPlaywrightTest < ApplicationPlaywrightTestCase
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
      title: "Test Job",
      status: "open",
      priority: "normal",
      created_by: @user
    )

    sign_in_as(@user)
  end

  test "NEW TASK line stays at bottom when adding tasks" do
    # Navigate to job page
    visit "/clients/#{@client.id}/jobs/#{@job.id}"
    sleep 0.5
    ensure_csrf_token

    # Verify NEW TASK placeholder is present
    new_task_placeholder = @page.locator(".new-task-wrapper")
    assert new_task_placeholder.count > 0, "NEW TASK placeholder should be present"

    # Click on NEW TASK to add a task
    new_task_placeholder.click
    sleep 0.2

    # Type in the input field
    new_task_input = @page.locator(".new-task-input")
    new_task_input.fill("First Task")
    new_task_input.press("Enter")

    # Wait for task to be created
    sleep 0.5

    # Verify the first task was created
    first_task = @page.locator(".task-item[data-task-id]").first
    assert_equal "First Task", first_task.locator(".task-title").text_content

    # Verify NEW TASK placeholder is still at the bottom
    all_task_wrappers = @page.locator(".task-wrapper")
    last_wrapper = all_task_wrappers.last
    assert last_wrapper.evaluate("el => el.classList.contains('new-task-wrapper')"),
           "NEW TASK placeholder should be the last element"

    # Add another task
    new_task_input.fill("Second Task")
    new_task_input.press("Enter")
    sleep 0.5

    # Verify both tasks exist
    tasks = @page.locator(".task-item[data-task-id]")
    assert_equal 2, tasks.count

    # Verify order: First Task, Second Task, NEW TASK placeholder
    assert_equal "First Task", tasks.first.locator(".task-title").text_content
    assert_equal "Second Task", tasks.nth(1).locator(".task-title").text_content

    # Verify NEW TASK is still last
    all_wrappers_after = @page.locator(".task-wrapper")
    last_wrapper_after = all_wrappers_after.last
    assert last_wrapper_after.evaluate("el => el.classList.contains('new-task-wrapper')"),
           "NEW TASK placeholder should remain at the bottom"
  end

  test "NEW TASK line persists after page reload" do
    visit "/clients/#{@client.id}/jobs/#{@job.id}"
    sleep 0.5
    ensure_csrf_token

    # Add a task
    new_task_placeholder = @page.locator(".new-task-wrapper")
    new_task_placeholder.click
    sleep 0.2

    new_task_input = @page.locator(".new-task-input")
    new_task_input.fill("Test Task")
    new_task_input.press("Enter")
    sleep 0.5

    # Reload the page
    @page.reload
    sleep 0.5

    # Verify task exists
    task = @page.locator(".task-item[data-task-id]").first
    assert_equal "Test Task", task.locator(".task-title").text_content

    # Verify NEW TASK placeholder is still present and at the bottom
    new_task_after_reload = @page.locator(".new-task-wrapper")
    assert new_task_after_reload.count > 0, "NEW TASK placeholder should persist after reload"

    all_wrappers = @page.locator(".task-wrapper")
    last_wrapper = all_wrappers.last
    assert last_wrapper.evaluate("el => el.classList.contains('new-task-wrapper')"),
           "NEW TASK placeholder should be at the bottom after reload"
  end

  test "pressing Return creates new task using contenteditable approach" do
    visit "/clients/#{@client.id}/jobs/#{@job.id}"
    sleep 0.5
    ensure_csrf_token

    # Press Enter to create a new task from an existing task
    # First create a task
    new_task_placeholder = @page.locator(".new-task-wrapper")
    new_task_placeholder.click
    sleep 0.2

    new_task_input = @page.locator(".new-task-input")
    new_task_input.fill("Initial Task")
    new_task_input.press("Enter")
    sleep 0.5

    # Select the task and press Return
    task = @page.locator(".task-item[data-task-id]").first
    task.click
    sleep 0.2

    # Press Return to create a new task below
    @page.keyboard.press("Enter")
    sleep 0.5

    # A new contenteditable task should appear
    inline_task = @page.locator(".new-inline-task")
    assert inline_task.count > 0, "New inline task should be created"

    # Type in the new inline task
    inline_task_title = inline_task.locator('[contenteditable="true"]')
    inline_task_title.fill("Task Created via Return")

    # Blur to save
    inline_task_title.evaluate("el => el.blur()")
    sleep 0.5

    # Verify the task was created
    tasks = @page.locator(".task-item[data-task-id]")
    assert_equal 2, tasks.count
    assert_equal "Initial Task", tasks.first.locator(".task-title").text_content
    assert_equal "Task Created via Return", tasks.nth(1).locator(".task-title").text_content

    # Verify NEW TASK placeholder is still at the bottom
    all_wrappers = @page.locator(".task-wrapper")
    last_wrapper = all_wrappers.last
    assert last_wrapper.evaluate("el => el.classList.contains('new-task-wrapper')"),
           "NEW TASK placeholder should still be at the bottom"
  end

  test "escape key cancels new task input and restores placeholder" do
    visit "/clients/#{@client.id}/jobs/#{@job.id}"
    sleep 0.5
    ensure_csrf_token

    # Click NEW TASK placeholder
    new_task_placeholder = @page.locator(".new-task-wrapper")
    new_task_placeholder.click
    sleep 0.2

    # Type something but don't save
    new_task_input = @page.locator(".new-task-input")
    new_task_input.fill("This will be cancelled")

    # Press Escape to cancel
    new_task_input.press("Escape")
    sleep 0.2

    # Verify input is gone and placeholder text is restored
    assert_equal 0, @page.locator(".new-task-input").count, "Input should be removed"
    placeholder_text = new_task_placeholder.locator(".task-title").text_content
    assert_equal "New task...", placeholder_text, "Placeholder text should be restored"

    # Verify placeholder is still clickable
    new_task_placeholder.click
    sleep 0.2
    assert @page.locator(".new-task-input").count > 0, "Placeholder should still be functional"
  end

  private

  def sign_in_as(user)
    visit "/login"
    fill_in "#email", with: user.email
    fill_in "#password", with: "secret123"
    click_on "Sign In"
    wait_for_navigation
  end

  def wait_for_navigation
    sleep 0.5
  end

  def ensure_csrf_token
    @page.evaluate(<<~JS)
      if (!document.querySelector('meta[name="csrf-token"]')) {
        const meta = document.createElement('meta');
        meta.name = 'csrf-token';
        meta.content = 'test-token';
        document.head.appendChild(meta);
      }
    JS
  end
end
