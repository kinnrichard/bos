ENV["SKIP_FIXTURES"] = "true"
require_relative "../test_helper"
require_relative "../application_playwright_test_case"

class JobStatusLabelsPlaywrightTest < ApplicationPlaywrightTestCase
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

    # Create jobs with different statuses to test
    @jobs = {
      open: Job.create!(
        client: @client,
        title: "Open Job",
        status: "open",
        priority: "normal",
        created_by: @user
      ),
      in_progress: Job.create!(
        client: @client,
        title: "In Progress Job",
        status: "in_progress",
        priority: "high",
        created_by: @user
      ),
      waiting_for_customer: Job.create!(
        client: @client,
        title: "Waiting Job",
        status: "waiting_for_customer",
        priority: "proactive_followup",
        created_by: @user
      ),
      waiting_for_scheduled_appointment: Job.create!(
        client: @client,
        title: "Scheduled Job",
        status: "waiting_for_scheduled_appointment",
        priority: "low",
        created_by: @user
      ),
      successfully_completed: Job.create!(
        client: @client,
        title: "Completed Job",
        status: "successfully_completed",
        priority: "critical",
        created_by: @user
      ),
      cancelled: Job.create!(
        client: @client,
        title: "Cancelled Job",
        status: "cancelled",
        priority: "normal",
        created_by: @user
      )
    }

    # Sign in user
    visit "/login"
    fill_in "Email", with: @user.email
    fill_in "Password", with: "secret123"
    click_on "Sign In"
    sleep 0.5
  end

  test "all job status labels display correctly without underscores or hyphens" do
    expected_labels = {
      open: "Open",
      in_progress: "In Progress",
      waiting_for_customer: "Waiting for Customer",
      waiting_for_scheduled_appointment: "Scheduled",
      successfully_completed: "Completed",
      cancelled: "Cancelled"
    }

    @jobs.each do |status_key, job|
      # Visit job page
      visit "/clients/#{@client.id}/jobs/#{job.id}"
      sleep 0.5

      # Check status in header bubble
      bubble_text = @page.evaluate(<<~JS)
        document.querySelector('.job-status-bubble')?.textContent.trim()
      JS
      assert_not_nil bubble_text, "Status bubble should exist for #{status_key}"

      # Open job popover to check status display
      @page.click('button[data-action="click->header-job#toggleJobPopover"]')
      sleep 0.3

      # Get status dropdown text
      status_text = @page.evaluate(<<~JS)
        (() => {
          const dropdown = document.querySelector('.job-popover .dropdown-button');
          return dropdown?.textContent.trim();
        })()
      JS

      expected_label = expected_labels[status_key]
      assert_includes status_text, expected_label, "Status should display as '#{expected_label}' for #{status_key}"
      assert_not_includes status_text, status_key.to_s, "Should not show raw status key '#{status_key}'"
      assert_not_includes status_text, "_", "Should not contain underscores"
      refute_match /\b\w+-\w+\b/, status_text, "Should not contain hyphenated words"

      # Close popover
      @page.keyboard.press("Escape")
      sleep 0.2
    end
  end

  test "all priority labels display correctly without underscores" do
    expected_labels = {
      critical: "Critical",
      high: "High",
      normal: "Normal",
      low: "Low",
      proactive_followup: "Proactive Follow-up"
    }

    # Visit a job page to test priority dropdowns
    job = @jobs[:waiting_for_customer] # Has proactive_followup priority
    visit "/clients/#{@client.id}/jobs/#{job.id}"
    sleep 0.5

    # Open job popover
    @page.click('button[data-action="click->header-job#toggleJobPopover"]')
    sleep 0.3

    # Check current priority display
    priority_text = @page.evaluate(<<~JS)
      (() => {
        const buttons = document.querySelectorAll('.job-popover .dropdown-button');
        return buttons[2]?.textContent.trim(); // Priority is third dropdown
      })()
    JS

    assert_includes priority_text, "Proactive Follow-up", "Priority should display as 'Proactive Follow-up'"
    assert_not_includes priority_text, "proactive_followup", "Should not show raw priority key"
    assert_not_includes priority_text, "_", "Should not contain underscores"

    # Open priority dropdown to check all options
    @page.locator(".job-popover .dropdown-button").nth(2).click
    sleep 0.2

    # Check all priority options
    priority_options = @page.evaluate(<<~JS)
      (() => {
        const options = document.querySelectorAll('.priority-option');
        return Array.from(options).map(opt => ({
          text: opt.textContent.trim(),
          dataValue: opt.dataset.priority
        }));
      })()
    JS

    expected_labels.each do |key, label|
      # HTML data attributes convert underscores to hyphens
      data_key = key.to_s.gsub("_", "-")
      option = priority_options.find { |opt| opt["dataValue"] == data_key }
      assert_not_nil option, "Should have option for #{key}"
      assert_includes option["text"], label, "Option should display as '#{label}'"
      assert_not_includes option["text"], "_", "Option should not contain underscores"
    end
  end

  test "status labels remain correct after page reload" do
    # Test the most problematic status
    job = @jobs[:waiting_for_customer]
    visit "/clients/#{@client.id}/jobs/#{job.id}"
    sleep 0.5

    # Check initial display
    @page.click('button[data-action="click->header-job#toggleJobPopover"]')
    sleep 0.3

    initial_status = @page.evaluate(<<~JS)
      document.querySelector('.job-popover .dropdown-button').textContent.trim()
    JS
    assert_includes initial_status, "Waiting for Customer", "Initial status should be correct"

    # Close popover and reload
    @page.keyboard.press("Escape")
    sleep 0.2
    @page.reload
    sleep 0.5

    # Check status after reload
    @page.click('button[data-action="click->header-job#toggleJobPopover"]')
    sleep 0.3

    reloaded_status = @page.evaluate(<<~JS)
      document.querySelector('.job-popover .dropdown-button').textContent.trim()
    JS
    assert_includes reloaded_status, "Waiting for Customer", "Status should remain correct after reload"
    assert_not_includes reloaded_status, "waiting_for_customer", "Should not show underscores after reload"
  end

  test "status labels in dropdown options are all correct" do
    # Visit any job page
    job = @jobs[:open]
    visit "/clients/#{@client.id}/jobs/#{job.id}"
    sleep 0.5

    # Open job popover
    @page.click('button[data-action="click->header-job#toggleJobPopover"]')
    sleep 0.3

    # Open status dropdown
    @page.click(".job-popover .dropdown-button")
    sleep 0.2

    # Get all status options
    status_options = @page.evaluate(<<~JS)
      (() => {
        const options = document.querySelectorAll('.status-option');
        return Array.from(options).map(opt => ({
          text: opt.textContent.trim(),
          dataStatus: opt.dataset.status,
          hasUnderscore: opt.textContent.includes('_'),
          hasHyphenInText: /\\b\\w+-\\w+\\b/.test(opt.textContent)
        }));
      })()
    JS

    # Expected status labels (using string keys for hash access)
    expected_statuses = {
      "open" => "Open",
      "in_progress" => "In Progress",
      "paused" => "Paused",
      "waiting_for_customer" => "Waiting for Customer",
      "waiting_for_scheduled_appointment" => "Scheduled",
      "successfully_completed" => "Completed",
      "cancelled" => "Cancelled"
    }

    status_options.each do |option|
      data_status = option["dataStatus"]
      expected_label = expected_statuses[data_status]

      assert_not_nil expected_label, "Should have expected label for #{data_status}"
      assert_includes option["text"], expected_label, "Status option should display as '#{expected_label}'"
      assert_not option["hasUnderscore"], "Status option '#{option["text"]}' should not contain underscores"

      # Only check for hyphens in the display text, not in compound words like "Follow-up"
      if expected_label && !expected_label.include?("-")
        assert_not option["hasHyphenInText"], "Status option '#{option["text"]}' should not contain hyphens"
      end
    end

    # Verify the data attributes have underscores (JobStatus returns keys with underscores)
    assert status_options.any? { |opt| opt["dataStatus"] == "waiting_for_customer" },
           "Data attribute should have underscores for waiting_for_customer"
  end

  test "task status labels also display correctly" do
    # Create a job with tasks
    job = Job.create!(
      client: @client,
      title: "Job with Tasks",
      status: "open",
      priority: "normal",
      created_by: @user
    )

    task = Task.create!(
      job: job,
      title: "Test Task",
      status: "new_task",
      position: 1
    )

    visit "/clients/#{@client.id}/jobs/#{job.id}"
    sleep 0.5

    # Check task status display
    task_status_text = @page.evaluate(<<~JS)
      (() => {
        const taskElement = document.querySelector('[data-task-id="#{task.id}"]');
        const statusButton = taskElement?.querySelector('.task-status-button');
        return statusButton?.textContent.trim();
      })()
    JS

    assert_not_nil task_status_text, "Task status button should exist"
    # Task status shows emoji only, but let's check the dropdown options

    # Click task status to open dropdown
    @page.click("[data-task-id='#{task.id}'] .task-status-button")
    sleep 0.2

    # Check task status options
    task_options = @page.evaluate(<<~JS)
      (() => {
        const dropdown = document.querySelector('.task-status-dropdown:not(.hidden)');
        if (!dropdown) return null;
      #{'  '}
        const options = dropdown.querySelectorAll('.task-status-option');
        return Array.from(options).map(opt => ({
          text: opt.textContent.trim(),
          hasUnderscore: opt.textContent.includes('_')
        }));
      })()
    JS

    if task_options
      task_options.each do |option|
        assert_not option["hasUnderscore"], "Task status option should not contain underscores: #{option["text"]}"
      end
    end
  end

  test "status updates preserve correct labels" do
    job = @jobs[:open]
    visit "/clients/#{@client.id}/jobs/#{job.id}"
    sleep 0.5

    # Open job popover
    @page.click('button[data-action="click->header-job#toggleJobPopover"]')
    sleep 0.3

    # Open status dropdown
    @page.click(".job-popover .dropdown-button")
    sleep 0.2

    # Change to waiting_for_customer
    @page.click('.status-option[data-status="waiting_for_customer"]')
    sleep 0.5

    # Check the updated display
    updated_status = @page.evaluate(<<~JS)
      document.querySelector('.job-popover .dropdown-button').textContent.trim()
    JS

    assert_includes updated_status, "Waiting for Customer", "Updated status should display correctly"
    assert_not_includes updated_status, "waiting_for_customer", "Should not show underscores"
    assert_not_includes updated_status, "Waiting-For-Customer", "Should not show hyphens between words"

    # Verify in database
    job.reload
    assert_equal "waiting_for_customer", job.status, "Database should store with underscores"
  end
end
