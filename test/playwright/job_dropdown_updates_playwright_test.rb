ENV["SKIP_FIXTURES"] = "true"
require_relative "../test_helper"
require_relative "../application_playwright_test_case"

class JobDropdownUpdatesPlaywrightTest < ApplicationPlaywrightTestCase
  setup do
    # Create test data
    @user = User.create!(
      name: "Test User",
      email: "test@example.com",
      password: "secret123",
      role: "admin"
    )

    @technician1 = User.create!(
      name: "Test Technician 1",
      email: "tech1@example.com",
      password: "secret123",
      role: "technician"
    )

    @technician2 = User.create!(
      name: "Test Technician 2",
      email: "tech2@example.com",
      password: "secret123",
      role: "technician"
    )

    @client = Client.create!(
      name: "Test Client",
      client_type: "residential"
    )

    @job = Job.create!(
      client: @client,
      title: "Test Job for Dropdown Updates",
      status: "open",
      priority: "normal",
      created_by: @user
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

    # Set up console error monitoring
    @page.evaluate(<<~JS)
      window.consoleErrors = [];
      window.networkErrors = [];

      // Monitor console errors
      const originalError = console.error;
      console.error = function(...args) {
        window.consoleErrors.push(args.join(' '));
        originalError.apply(console, args);
      };

      // Monitor network errors
      window.addEventListener('error', (event) => {
        if (event.message && event.message.includes('Failed to fetch')) {
          window.networkErrors.push(event.message);
        }
      });

      // Monitor unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        window.consoleErrors.push('Unhandled Promise Rejection: ' + event.reason);
      });
    JS
  end

  test "status dropdown updates without errors and returns JSON" do
    # Open the job status popover
    @page.click('button[data-action="click->header-job#toggleJobPopover"]')
    sleep 0.3

    # Record initial status
    initial_status = @page.evaluate(<<~JS)
      document.querySelector('.job-popover .dropdown-button').textContent.trim()
    JS

    # Click the status dropdown
    @page.click(".job-popover .dropdown-button")
    sleep 0.2

    # Change status to "In Progress"
    @page.click('.job-popover .status-option[data-status="in_progress"]')
    sleep 0.5 # Wait for AJAX request

    # Check for errors
    errors = @page.evaluate("window.consoleErrors || []")
    assert_empty errors, "Console errors occurred: #{errors.join(', ')}"

    network_errors = @page.evaluate("window.networkErrors")
    assert_empty network_errors, "Network errors occurred: #{network_errors.join(', ')}"

    # Verify status was updated in UI
    new_status = @page.evaluate(<<~JS)
      document.querySelector('.job-popover .dropdown-button').textContent.trim()
    JS
    assert_includes new_status, "In Progress", "Status should have changed to In Progress"

    # Verify the job bubble also updated
    bubble_has_green = @page.evaluate(<<~JS)
      (() => {
        const bubble = document.querySelector('.job-status-bubble');
        return bubble && bubble.textContent.includes('🟢');
      })()
    JS
    assert bubble_has_green, "Job status bubble should show green indicator"

    # Reload and verify persistence
    @page.reload
    sleep 0.5

    @job.reload
    assert_equal "in_progress", @job.status, "Status should be persisted in database"
  end

  test "priority dropdown updates without errors and returns JSON" do
    # Open the job status popover
    @page.click('button[data-action="click->header-job#toggleJobPopover"]')
    sleep 0.3

    # Click the priority dropdown (third dropdown)
    priority_button = @page.locator(".job-popover .dropdown-button").nth(2)
    priority_button.click
    sleep 0.2

    # Change priority to "High"
    @page.click('.job-popover .priority-option[data-priority="high"]')
    sleep 0.5 # Wait for AJAX request

    # Check for errors
    errors = @page.evaluate("window.consoleErrors || []")
    assert_empty errors, "Console errors occurred: #{errors.join(', ')}"

    # Verify priority was updated in UI
    new_priority = @page.evaluate(<<~JS)
      (() => {
        const buttons = document.querySelectorAll('.job-popover .dropdown-button');
        return buttons[2].textContent.trim();
      })()
    JS
    assert_includes new_priority, "High", "Priority should have changed to High"

    # Verify the job bubble shows priority indicator
    bubble_has_priority = @page.evaluate(<<~JS)
      (() => {
        const bubble = document.querySelector('.job-status-bubble');
        return bubble && bubble.textContent.includes('❗');
      })()
    JS
    assert bubble_has_priority, "Job status bubble should show high priority indicator"

    # Verify persistence
    @job.reload
    assert_equal "high", @job.priority, "Priority should be persisted in database"
  end

  test "technician assignment updates without errors and returns JSON" do
    # Open the job status popover
    @page.click('button[data-action="click->header-job#toggleJobPopover"]')
    sleep 0.3

    # Click the assigned to dropdown (second dropdown)
    assigned_button = @page.locator(".job-popover .dropdown-button").nth(1)
    assigned_button.click
    sleep 0.2

    # Assign first technician
    @page.click(".job-popover .assignee-option[data-technician-id='#{@technician1.id}']")
    sleep 0.5 # Wait for AJAX request

    # Check for errors
    errors = @page.evaluate("window.consoleErrors || []")
    assert_empty errors, "Console errors occurred: #{errors.join(', ')}"

    # Verify technician was assigned in UI
    assigned_text = @page.evaluate(<<~JS)
      (() => {
        const buttons = document.querySelectorAll('.job-popover .dropdown-button');
        return buttons[1].textContent.trim();
      })()
    JS
    assert_includes assigned_text, @technician1.name, "Should show assigned technician name"

    # Verify checkmark appears
    has_checkmark = @page.evaluate(<<~JS)
      (() => {
        const option = document.querySelector(".assignee-option[data-technician-id='#{@technician1.id}']");
        return option && option.querySelector('.checkmark') !== null;
      })()
    JS
    assert has_checkmark, "Assigned technician should have checkmark"

    # Verify persistence
    @job.reload
    assert_includes @job.technicians, @technician1, "Technician should be assigned in database"
  end

  test "multiple technician assignments work without errors" do
    # Open the job status popover
    @page.click('button[data-action="click->header-job#toggleJobPopover"]')
    sleep 0.3

    # Click the assigned to dropdown
    assigned_button = @page.locator(".job-popover .dropdown-button").nth(1)
    assigned_button.click
    sleep 0.2

    # Assign both technicians
    @page.click(".job-popover .assignee-option[data-technician-id='#{@technician1.id}']")
    sleep 0.3
    @page.click(".job-popover .assignee-option[data-technician-id='#{@technician2.id}']")
    sleep 0.5

    # Check for errors
    errors = @page.evaluate("window.consoleErrors || []")
    assert_empty errors, "Console errors occurred: #{errors.join(', ')}"

    # Verify UI shows multiple assigned
    assigned_text = @page.evaluate(<<~JS)
      (() => {
        const buttons = document.querySelectorAll('.job-popover .dropdown-button');
        return buttons[1].textContent.trim();
      })()
    JS
    assert_includes assigned_text, "2 assigned", "Should show count when multiple assigned"

    # Verify both have checkmarks
    both_checked = @page.evaluate(<<~JS)
      (() => {
        const tech1 = document.querySelector(".assignee-option[data-technician-id='#{@technician1.id}']");
        const tech2 = document.querySelector(".assignee-option[data-technician-id='#{@technician2.id}']");
        return tech1?.querySelector('.checkmark') && tech2?.querySelector('.checkmark');
      })()
    JS
    assert both_checked, "Both technicians should have checkmarks"

    # Verify persistence
    @job.reload
    assert_equal 2, @job.technicians.count, "Both technicians should be assigned"
    assert_includes @job.technicians, @technician1
    assert_includes @job.technicians, @technician2
  end

  test "unassigning technicians works without errors" do
    # First assign a technician
    @job.job_assignments.create!(user: @technician1)
    @page.reload
    sleep 0.5

    # Open the job status popover
    @page.click('button[data-action="click->header-job#toggleJobPopover"]')
    sleep 0.3

    # Click the assigned to dropdown
    assigned_button = @page.locator(".job-popover .dropdown-button").nth(1)
    assigned_button.click
    sleep 0.2

    # Click on Unassigned option
    @page.click('.job-popover .assignee-option[data-action*="setUnassigned"]')
    sleep 0.5

    # Check for errors
    errors = @page.evaluate("window.consoleErrors || []")
    assert_empty errors, "Console errors occurred: #{errors.join(', ')}"

    # Verify UI shows unassigned
    assigned_text = @page.evaluate(<<~JS)
      (() => {
        const buttons = document.querySelectorAll('.job-popover .dropdown-button');
        return buttons[1].textContent.trim();
      })()
    JS
    assert_includes assigned_text, "Unassigned", "Should show Unassigned"

    # Verify persistence
    @job.reload
    assert_empty @job.technicians, "No technicians should be assigned"
  end

  test "rapid dropdown changes don't cause errors" do
    # Open the job status popover
    @page.click('button[data-action="click->header-job#toggleJobPopover"]')
    sleep 0.3

    # Rapidly change status multiple times
    3.times do |i|
      # Open status dropdown
      @page.click(".job-popover .dropdown-button")
      sleep 0.1

      # Click different statuses
      statuses = [ "in_progress", "paused", "successfully_completed" ]
      @page.click(".job-popover .status-option[data-status='#{statuses[i]}']")
      sleep 0.2
    end

    # Check for errors
    errors = @page.evaluate("window.consoleErrors")
    assert_empty errors, "Console errors occurred during rapid changes: #{errors.join(', ')}"

    # Verify final status is correct
    @job.reload
    assert_equal "successfully_completed", @job.status, "Final status should be successfully_completed"
  end

  test "dropdown updates work after scrolling" do
    # Add tasks to make page scrollable
    10.times do |i|
      Task.create!(
        job: @job,
        title: "Task #{i + 1}",
        position: i + 1,
        status: "new_task"
      )
    end

    @page.reload
    sleep 0.5

    # Scroll down
    @page.evaluate("window.scrollBy(0, 300)")
    sleep 0.2

    # Open the job status popover
    @page.click('button[data-action="click->header-job#toggleJobPopover"]')
    sleep 0.3

    # Change priority
    priority_button = @page.locator(".job-popover .dropdown-button").nth(2)
    priority_button.click
    sleep 0.2

    @page.click('.job-popover .priority-option[data-priority="critical"]')
    sleep 0.5

    # Check for errors
    errors = @page.evaluate("window.consoleErrors || []")
    assert_empty errors, "Console errors occurred after scrolling: #{errors.join(', ')}"

    # Verify update worked
    @job.reload
    assert_equal "critical", @job.priority, "Priority should be updated after scrolling"
  end

  test "invalid updates return error response without breaking UI" do
    # Open the job status popover
    @page.click('button[data-action="click->header-job#toggleJobPopover"]')
    sleep 0.3

    # Temporarily break the job to cause validation error
    @job.update_column(:title, "") # Direct DB update to bypass validation

    # Try to change status
    @page.click(".job-popover .dropdown-button")
    sleep 0.2
    @page.click('.job-popover .status-option[data-status="in_progress"]')
    sleep 0.5

    # UI should still update optimistically (no errors visible to user)
    status_text = @page.evaluate(<<~JS)
      document.querySelector('.job-popover .dropdown-button').textContent.trim()
    JS
    assert_includes status_text, "In Progress", "UI should update optimistically"

    # But database should not be updated due to validation error
    @job.reload
    assert_equal "open", @job.status, "Status should not change in DB due to validation error"
  end

  test "multi-word status 'waiting_for_customer' updates correctly" do
    # Open the job status popover
    @page.click('button[data-action="click->header-job#toggleJobPopover"]')
    sleep 0.3

    # Click the status dropdown
    @page.click(".job-popover .dropdown-button")
    sleep 0.2

    # Change status to "Waiting for Customer"
    @page.click('.job-popover .status-option[data-status="waiting_for_customer"]')
    sleep 0.5 # Wait for AJAX request

    # Check for errors
    errors = @page.evaluate("window.consoleErrors || []")
    assert_empty errors, "Console errors occurred: #{errors.join(', ')}"

    # Verify status was updated in UI with correct label
    status_text = @page.evaluate(<<~JS)
      document.querySelector('.job-popover .dropdown-button').textContent.trim()
    JS
    assert_includes status_text, "Waiting for Customer", "Status should display as 'Waiting for Customer' (not with underscores)"
    assert_not_includes status_text, "waiting_for_customer", "Should not show underscores in UI"
    assert_not_includes status_text, "Waiting-For-Customer", "Should not show hyphens in UI"

    # Verify the job bubble also updated
    bubble_has_waiting = @page.evaluate(<<~JS)
      (() => {
        const bubble = document.querySelector('.job-status-bubble');
        return bubble && bubble.textContent.includes('⏳');
      })()
    JS
    assert bubble_has_waiting, "Job status bubble should show waiting indicator"

    # Reload and verify persistence and correct display
    @page.reload
    sleep 0.5

    # Verify database has correct value
    @job.reload
    assert_equal "waiting_for_customer", @job.status, "Status should be persisted with underscores in database"

    # Open popover again to check display after reload
    @page.click('button[data-action="click->header-job#toggleJobPopover"]')
    sleep 0.3

    # Verify status still displays correctly after reload
    reloaded_status = @page.evaluate(<<~JS)
      document.querySelector('.job-popover .dropdown-button').textContent.trim()
    JS
    assert_includes reloaded_status, "Waiting for Customer", "Status should still display correctly after reload"
    assert_not_includes reloaded_status, "waiting_for_customer", "Should not show underscores after reload"
  end

  test "multi-word priority 'proactive_followup' updates correctly" do
    # Open the job status popover
    @page.click('button[data-action="click->header-job#toggleJobPopover"]')
    sleep 0.3

    # Click the priority dropdown (third dropdown)
    priority_button = @page.locator(".job-popover .dropdown-button").nth(2)
    priority_button.click
    sleep 0.2

    # Change priority to "Proactive Follow-up"
    @page.click('.job-popover .priority-option[data-priority="proactive-followup"]')
    sleep 0.5 # Wait for AJAX request

    # Check for errors
    errors = @page.evaluate("window.consoleErrors || []")
    assert_empty errors, "Console errors occurred: #{errors.join(', ')}"

    # Verify priority was updated in UI with correct label
    priority_text = @page.evaluate(<<~JS)
      (() => {
        const buttons = document.querySelectorAll('.job-popover .dropdown-button');
        return buttons[2].textContent.trim();
      })()
    JS
    assert_includes priority_text, "Proactive Follow-up", "Priority should display as 'Proactive Follow-up'"
    assert_not_includes priority_text, "proactive_followup", "Should not show underscores in UI"

    # Verify persistence
    @job.reload
    assert_equal "proactive_followup", @job.priority, "Priority should be persisted with underscores in database"
  end
end
