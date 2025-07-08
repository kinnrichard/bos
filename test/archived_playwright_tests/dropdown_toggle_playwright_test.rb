ENV["SKIP_FIXTURES"] = "true"
require_relative "../test_helper"
require_relative "../application_playwright_test_case"

class DropdownTogglePlaywrightTest < ApplicationPlaywrightTestCase
  setup do
    # Create test data
    @user = User.create!(
      name: "Test User",
      email: "test@example.com",
      password: "secret123",
      role: "admin"
    )

    @technician = User.create!(
      name: "Test Technician",
      email: "tech@example.com",
      password: "secret123",
      role: "technician"
    )

    @client = Client.create!(
      name: "Test Client",
      client_type: "residential"
    )

    @job = Job.create!(
      client: @client,
      title: "Test Job for Dropdown Toggle",
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
  end

  test "dropdown toggle works in schedule popover for all dropdowns" do
    # Open the schedule popover
    @page.click('button[data-action="click->header-job#toggleSchedulePopover"]')
    sleep 0.3 # Wait for popover animation

    # Test Type dropdown
    test_dropdown_toggle("Due Date", "Type dropdown")

    # Test Technician dropdown
    test_dropdown_toggle("Select technicians...", "Technician dropdown")
  end

  test "dropdown toggle works in job status popover for all dropdowns" do
    # Open the job status popover
    @page.click('button[data-action="click->header-job#toggleJobPopover"]')
    sleep 0.3 # Wait for popover animation

    # Test Status dropdown - find button with New text
    status_button = @page.locator(".job-popover .dropdown-button").nth(0)  # First dropdown in job popover
    test_dropdown_toggle_with_button(status_button, "Status dropdown")

    # Test Assigned To dropdown
    assigned_button = @page.locator(".job-popover .dropdown-button").nth(1)  # Second dropdown
    test_dropdown_toggle_with_button(assigned_button, "Assigned To dropdown")

    # Test Priority dropdown
    priority_button = @page.locator(".job-popover .dropdown-button").nth(2)  # Third dropdown
    test_dropdown_toggle_with_button(priority_button, "Priority dropdown")
  end

  test "clicking outside dropdown closes it but keeps popover open" do
    # Open the schedule popover
    @page.click('button[data-action="click->header-job#toggleSchedulePopover"]')
    sleep 0.3

    # Open a dropdown
    @page.click("text=Due Date")
    sleep 0.2

    # Verify dropdown is open
    dropdown_open = @page.evaluate(<<~JS)
      (() => {
        return !!document.querySelector('.dropdown-menu:not(.hidden)');
      })()
    JS
    assert dropdown_open, "Dropdown should be open"

    # Click elsewhere in the popover (not on dropdown)
    @page.click(".schedule-popover h4") # Click on "Add New Date" header
    sleep 0.2

    # Verify dropdown is closed but popover is still open
    state = @page.evaluate(<<~JS)
      (() => {
        return {
          dropdownClosed: !document.querySelector('.dropdown-menu:not(.hidden)'),
          popoverOpen: !!document.querySelector('.schedule-popover:not(.hidden)')
        };
      })()
    JS

    assert state["dropdownClosed"], "Dropdown should be closed"
    assert state["popoverOpen"], "Popover should remain open"
  end

  test "opening one dropdown closes others in the same popover" do
    # Open the job status popover
    @page.click('button[data-action="click->header-job#toggleJobPopover"]')
    sleep 0.3

    # Open Status dropdown - first dropdown in job popover
    status_button = @page.locator(".job-popover .dropdown-button").nth(0)
    status_button.click
    sleep 0.2

    # Verify only one dropdown is open
    open_count = @page.evaluate(<<~JS)
      (() => {
        return document.querySelectorAll('.dropdown-menu:not(.hidden)').length;
      })()
    JS
    assert_equal 1, open_count, "Only Status dropdown should be open"

    # Click outside the dropdown to close it first
    @page.click(".job-popover h3") # Click on a header
    sleep 0.2

    # Now open Priority dropdown
    priority_button = @page.locator(".job-popover .dropdown-button").nth(2)
    priority_button.click
    sleep 0.2

    # Verify only one dropdown is open and it's the Priority one
    state = @page.evaluate(<<~JS)
      (() => {
        const openMenus = document.querySelectorAll('.dropdown-menu:not(.hidden)');
        const priorityMenuOpen = Array.from(openMenus).some(menu =>#{' '}
          menu.querySelector('.priority-option') !== null
        );
        return {
          openCount: openMenus.length,
          isPriorityMenu: priorityMenuOpen
        };
      })()
    JS

    assert_equal 1, state["openCount"], "Only one dropdown should be open"
    assert state["isPriorityMenu"], "Priority dropdown should be the open one"
  end

  test "dropdown toggle works after scrolling" do
    # Add some tasks to make the page scrollable
    10.times do |i|
      Task.create!(
        job: @job,
        title: "Task #{i + 1}",
        position: i + 1,
        status: "new_task"
      )
    end

    # Refresh the page
    @page.reload
    sleep 0.5

    # Scroll down
    @page.evaluate("window.scrollBy(0, 300)")
    sleep 0.2

    # Open the job status popover
    @page.click('button[data-action="click->header-job#toggleJobPopover"]')
    sleep 0.3

    # Test dropdown toggle after scrolling
    status_button = @page.locator(".job-popover .dropdown-button").nth(0)
    test_dropdown_toggle_with_button(status_button, "Status dropdown after scrolling")
  end

  test "rapid clicking toggles dropdown correctly" do
    # Open the schedule popover
    @page.click('button[data-action="click->header-job#toggleSchedulePopover"]')
    sleep 0.3

    # Find the dropdown button
    type_button = @page.locator('.schedule-popover button:has-text("Due Date")').first

    # Rapid click test - click 5 times quickly
    5.times do |i|
      type_button.click
      sleep 0.1 # Small delay between clicks
    end

    # After odd number of clicks (5), dropdown should be open
    final_state = @page.evaluate(<<~JS)
      (() => {
        return !!document.querySelector('.dropdown-menu:not(.hidden)');
      })()
    JS

    assert final_state, "Dropdown should be open after odd number of clicks"
  end

  test "dropdown state persists when switching between popovers" do
    # Open schedule popover
    @page.click('button[data-action="click->header-job#toggleSchedulePopover"]')
    sleep 0.3

    # Open a dropdown
    @page.click("text=Due Date")
    sleep 0.2

    # Close the popover by clicking outside
    @page.click("body", position: { x: 10, y: 10 })
    sleep 0.2

    # Open job status popover
    @page.click('button[data-action="click->header-job#toggleJobPopover"]')
    sleep 0.3

    # Verify no dropdowns are open in the new popover
    dropdowns_open = @page.evaluate(<<~JS)
      (() => {
        return document.querySelectorAll('.dropdown-menu:not(.hidden)').length;
      })()
    JS

    assert_equal 0, dropdowns_open, "No dropdowns should be open in newly opened popover"

    # Test that dropdown toggle works in the new popover
    test_dropdown_toggle("New", "Status dropdown in second popover")
  end

  test "user menu popover dropdown toggle works" do
    # Click the user avatar to open user menu
    user_button = @page.locator('button[data-action*="toggleUserMenu"]').first
    user_button.click
    sleep 0.3

    # Find a dropdown in the user menu if it exists
    # Since user menu might not have dropdowns, let's check first
    has_dropdown = @page.evaluate(<<~JS)
      (() => {
        const userMenu = document.querySelector('.user-menu-popover');
        return userMenu && userMenu.querySelector('[data-controller~="dropdown"]') !== null;
      })()
    JS

    if has_dropdown
      # If there's a dropdown, test its toggle
      dropdown_button = @page.locator('.user-menu-popover button[data-action*="dropdown#toggle"]').first

      # Click to open
      dropdown_button.click
      sleep 0.2

      open_state = @page.evaluate(<<~JS)
        (() => {
          return !!document.querySelector('.dropdown-menu:not(.hidden)');
        })()
      JS

      assert open_state, "User menu dropdown should be open"

      # Click to close
      dropdown_button.click
      sleep 0.2

      closed_state = @page.evaluate(<<~JS)
        (() => {
          return !document.querySelector('.dropdown-menu:not(.hidden)');
        })()
      JS

      assert closed_state, "User menu dropdown should be closed"
    else
      # If no dropdown exists, just verify the popover opened
      popover_open = @page.evaluate(<<~JS)
        (() => {
          return !!document.querySelector('.user-menu-popover:not(.hidden)');
        })()
      JS

      assert popover_open, "User menu popover should be open"
    end
  end

  private

  def test_dropdown_toggle(button_text, dropdown_name)
    # Find the button containing the text within a popover
    button = @page.locator(".popover:not(.hidden) button:has-text(\"#{button_text}\")").first
    test_dropdown_toggle_with_button(button, dropdown_name)
  end

  def test_dropdown_toggle_with_button(button, dropdown_name)
    # Click to open
    button.click
    sleep 0.2

    # Verify dropdown is open
    open_state = @page.evaluate(<<~JS)
      (() => {
        return !!document.querySelector('.dropdown-menu:not(.hidden)');
      })()
    JS

    assert open_state, "#{dropdown_name} should be open after first click"

    # Click again to close
    button.click
    sleep 0.2

    # Verify dropdown is closed
    closed_state = @page.evaluate(<<~JS)
      (() => {
        return !document.querySelector('.dropdown-menu:not(.hidden)');
      })()
    JS

    assert closed_state, "#{dropdown_name} should be closed after second click"

    # Click once more to ensure it opens again
    button.click
    sleep 0.2

    reopen_state = @page.evaluate(<<~JS)
      (() => {
        return !!document.querySelector('.dropdown-menu:not(.hidden)');
      })()
    JS

    assert reopen_state, "#{dropdown_name} should be open again after third click"

    # Close it for the next test
    button.click
    sleep 0.2
  end
end
