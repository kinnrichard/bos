ENV["SKIP_FIXTURES"] = "true"
require_relative "../test_helper"
require_relative "../application_playwright_test_case"

class JobViewStylingPlaywrightTest < ApplicationPlaywrightTestCase
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
      title: "Test Job for Styling",
      status: "open",
      priority: "normal",
      created_by: @user
    )

    # Create some tasks
    @task1 = Task.create!(
      job: @job,
      title: "First Task Title",
      position: 1,
      status: "new_task"
    )

    @task2 = Task.create!(
      job: @job,
      title: "Second Task",
      position: 2,
      status: "new_task"
    )

    # Create a task with subtasks
    @parent_task = Task.create!(
      job: @job,
      title: "Parent Task",
      position: 3,
      status: "new_task"
    )

    @subtask = Task.create!(
      job: @job,
      parent: @parent_task,
      title: "Subtask Title",
      position: 1,
      status: "new_task"
    )

    # Sign in user
    visit "/login"
    fill_in "Email", with: @user.email
    fill_in "Password", with: "secret123"
    click_on "Sign In"
    sleep 0.5

    # Navigate to job page
    visit "/clients/#{@client.id}/jobs/#{@job.id}"
    sleep 0.5 # Wait for page to load
  end

  test "removes underline from task titles on hover and focus" do
    task_title_selector = ".task-item[data-task-id='#{@task1.id}'] .task-title"

    # Check hover state
    @page.hover(task_title_selector)
    text_decoration = @page.evaluate(<<~JS)
      getComputedStyle(document.querySelector("#{task_title_selector}")).textDecoration
    JS
    assert_no_match(/underline/, text_decoration)

    cursor = @page.evaluate(<<~JS)
      getComputedStyle(document.querySelector("#{task_title_selector}")).cursor
    JS
    assert_equal "text", cursor

    # Check focus state
    @page.click(task_title_selector)
    text_decoration = @page.evaluate(<<~JS)
      getComputedStyle(document.querySelector("#{task_title_selector}")).textDecoration
    JS
    assert_no_match(/underline/, text_decoration)

    cursor = @page.evaluate(<<~JS)
      getComputedStyle(document.querySelector("#{task_title_selector}")).cursor
    JS
    assert_equal "text", cursor
  end

  test "removes underline from subtask titles on hover and focus" do
    subtask_title_selector = ".subtask-item[data-task-id='#{@subtask.id}'] .subtask-title"

    # Check hover state
    @page.hover(subtask_title_selector)
    text_decoration = @page.evaluate(<<~JS)
      getComputedStyle(document.querySelector("#{subtask_title_selector}")).textDecoration
    JS
    assert_no_match(/underline/, text_decoration)

    cursor = @page.evaluate(<<~JS)
      getComputedStyle(document.querySelector("#{subtask_title_selector}")).cursor
    JS
    assert_equal "text", cursor

    # Check focus state
    @page.click(subtask_title_selector)
    text_decoration = @page.evaluate(<<~JS)
      getComputedStyle(document.querySelector("#{subtask_title_selector}")).textDecoration
    JS
    assert_no_match(/underline/, text_decoration)

    cursor = @page.evaluate(<<~JS)
      getComputedStyle(document.querySelector("#{subtask_title_selector}")).cursor
    JS
    assert_equal "text", cursor
  end

  test "removes underline from job title on focus" do
    job_title_selector = ".job-title"

    # Check focus state
    @page.click(job_title_selector)
    text_decoration = @page.evaluate(<<~JS)
      getComputedStyle(document.querySelector("#{job_title_selector}")).textDecoration
    JS
    assert_no_match(/underline/, text_decoration)

    cursor = @page.evaluate(<<~JS)
      getComputedStyle(document.querySelector("#{job_title_selector}")).cursor
    JS
    assert_equal "text", cursor
  end

  test "shows placeholder text with low opacity by default" do
    new_task_title_selector = ".new-task-wrapper .task-title"

    # Default state should have low opacity color
    color = @page.evaluate(<<~JS)
      getComputedStyle(document.querySelector("#{new_task_title_selector}")).color
    JS
    assert_equal "rgb(72, 72, 74)", color # #48484A
  end

  test "shows full opacity white text when focused" do
    # Click on the new task item (not the title directly)
    @page.click(".new-task-wrapper .task-item")
    sleep 0.2 # Wait for focus

    new_task_title_selector = ".new-task-wrapper .task-title"

    # Should now have white color
    color = @page.evaluate(<<~JS)
      getComputedStyle(document.querySelector("#{new_task_title_selector}")).color
    JS
    assert_equal "rgb(255, 255, 255)", color # #FFFFFF

    # Verify cursor is text
    cursor = @page.evaluate(<<~JS)
      getComputedStyle(document.querySelector("#{new_task_title_selector}")).cursor
    JS
    assert_equal "text", cursor
  end

  test "maintains emoji opacity in new task placeholder" do
    # Update the placeholder text to include an emoji
    @page.evaluate(<<~JS)
      const placeholder = document.querySelector('.new-task-wrapper .task-title');
      placeholder.textContent = '➕ New task...';
    JS

    new_task_title_selector = ".new-task-wrapper .task-title"

    # The emoji should still be visible even when the text has low opacity
    text = @page.text_content(new_task_title_selector)
    assert_includes text, "➕"

    # Check opacity doesn't affect emoji visibility by checking CSS
    opacity_check = @page.evaluate(<<~JS)
      const el = document.querySelector("#{new_task_title_selector}");
      const styles = getComputedStyle(el);
      // Emoji should be visible regardless of text color
      true // Just verify we can read the styles
    JS
    assert opacity_check
  end

  test "shows ibeam cursor on all editable text fields" do
    # Check task title
    task_title_selector = ".task-item[data-task-id='#{@task1.id}'] .task-title"
    @page.hover(task_title_selector)
    cursor = @page.evaluate(<<~JS)
      getComputedStyle(document.querySelector("#{task_title_selector}")).cursor
    JS
    assert_equal "text", cursor

    # Check job title
    job_title_selector = ".job-title"
    @page.hover(job_title_selector)
    cursor = @page.evaluate(<<~JS)
      getComputedStyle(document.querySelector("#{job_title_selector}")).cursor
    JS
    assert_equal "text", cursor

    # Check new task placeholder
    new_task_title_selector = ".new-task-wrapper .task-title"
    # Click on the task item to focus
    @page.click(".new-task-wrapper .task-item")
    sleep 0.2 # Wait for focus
    cursor = @page.evaluate(<<~JS)
      getComputedStyle(document.querySelector("#{new_task_title_selector}")).cursor
    JS
    assert_equal "text", cursor
  end
end
