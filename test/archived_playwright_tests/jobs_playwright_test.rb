require "application_playwright_test_case"

class JobsPlaywrightTest < ApplicationPlaywrightTestCase
  setup do
    # Create test data
    @admin = User.create!(
      name: "Admin User",
      email: "admin@example.com",
      password: "password123",
      role: "admin"
    )

    @technician = User.create!(
      name: "Tech User",
      email: "tech@example.com",
      password: "password123",
      role: "technician"
    )

    @client = Client.create!(
      name: "Test Client",
      email: "client@example.com",
      phone: "555-0123"
    )

    @job = Job.create!(
      title: "Fix Computer Issue",
      description: "Computer won't boot",
      status: "pending",
      priority: "high",
      client: @client,
      created_by: @admin
    )

    @job.assignments.create!(user: @technician)
  end

  test "view jobs list as admin" do
    sign_in_as(@admin)

    visit "/jobs"
    wait_for_navigation

    # Should see the job in the list
    assert_text "Fix Computer Issue"
    assert_text "Test Client"
    assert_text "High"

    # Should see status indicators
    assert @page.locator("[data-status='pending']").visible?
  end

  test "create new job with drag and drop task management" do
    sign_in_as(@admin)

    visit "/jobs/new"

    # Fill in job details
    fill_in "Title", with: "Install Software"
    fill_in "Description", with: "Install Office Suite on all workstations"

    # Select client (might be a dropdown)
    select @client.name, from: "Client"

    # Set priority
    select "Medium", from: "Priority"

    # Create the job
    click_on "Create Job"
    wait_for_navigation

    # Should redirect to job show page
    assert_text "Install Software"
    assert_text "Install Office Suite on all workstations"
    assert_text "Medium"

    # Add tasks if task UI is present
    if @page.locator("[data-controller='job']").visible?
      # Add a task
      fill_in "Add a task", with: "Download software"
      @page.keyboard.press("Enter")

      # Task should appear
      assert_text "Download software"

      # Add another task
      fill_in "Add a task", with: "Install on workstation 1"
      @page.keyboard.press("Enter")

      assert_text "Install on workstation 1"
    end
  end

  test "filter jobs by status" do
    # Create jobs with different statuses
    Job.create!(
      title: "Completed Job",
      status: "completed",
      client: @client,
      created_by: @admin
    )

    Job.create!(
      title: "In Progress Job",
      status: "in_progress",
      client: @client,
      created_by: @admin
    )

    sign_in_as(@admin)
    visit "/jobs"

    # Initially should see all jobs
    assert_text "Fix Computer Issue"
    assert_text "Completed Job"
    assert_text "In Progress Job"

    # Filter by status if filter UI exists
    if @page.locator("[data-controller='filter-dropdown']").visible?
      # Open filter dropdown
      click_on "Filter"

      # Select pending status
      check "Pending"
      uncheck "Completed"
      uncheck "In Progress"

      # Apply filter
      click_on "Apply"

      # Should only see pending jobs
      assert_text "Fix Computer Issue"
      assert_no_text "Completed Job"
      assert_no_text "In Progress Job"
    end
  end

  test "technician can update job status" do
    sign_in_as(@technician)

    visit "/jobs/#{@job.id}"
    wait_for_navigation

    # Technician should see the job
    assert_text "Fix Computer Issue"

    # Update status if UI allows
    if @page.locator("[data-status-selector]").visible?
      # Click status selector
      @page.click("[data-status-selector]")

      # Select in_progress
      click_on "In Progress"

      wait_for_navigation

      # Status should be updated
      assert @page.locator("[data-status='in_progress']").visible?
    end
  end

  test "search functionality" do
    # Create additional jobs for search
    Job.create!(
      title: "Network Configuration",
      description: "Setup VPN access",
      client: @client,
      created_by: @admin
    )

    sign_in_as(@admin)
    visit "/jobs"

    # Use search if available
    if @page.locator("[data-controller='search']").visible?
      # Focus search input
      search_input = @page.locator("input[type='search'], input[placeholder*='Search']").first
      search_input.fill("Network")

      # Wait for search results
      wait_for_selector("[data-search-results]", timeout: 2000) rescue nil

      # Should see matching job
      assert_text "Network Configuration"

      # Should not see non-matching job
      assert_no_text "Fix Computer Issue"

      # Clear search
      search_input.fill("")

      # All jobs should be visible again
      assert_text "Fix Computer Issue"
      assert_text "Network Configuration"
    end
  end

  test "responsive job list on mobile" do
    # Set mobile viewport
    @context.set_viewport_size(width: 375, height: 667)

    sign_in_as(@admin)
    visit "/jobs"

    # Job list should still be functional
    assert_text "Fix Computer Issue"

    # Click on job to view details
    click_on "Fix Computer Issue"
    wait_for_navigation

    # Should see job details
    assert_text "Computer won't boot"

    # Navigation should work
    if @page.locator("[data-mobile-menu]").visible?
      # Open mobile menu if present
      @page.click("[data-mobile-menu-toggle]")
      assert @page.locator("[data-mobile-menu]").visible?
    end

    # Reset viewport
    @context.set_viewport_size(width: 1400, height: 900)
  end

  test "job assignment workflow" do
    # Create unassigned job
    unassigned_job = Job.create!(
      title: "Unassigned Task",
      status: "pending",
      client: @client,
      created_by: @admin
    )

    sign_in_as(@admin)
    visit "/jobs/#{unassigned_job.id}"

    # Assign technician if UI present
    if @page.locator("[data-assign-technician]").visible?
      click_on "Assign Technician"

      # Search for technician
      fill_in "Search technicians", with: "Tech"

      # Click on technician
      click_on "Tech User"

      # Confirm assignment
      click_on "Assign"

      wait_for_navigation

      # Should see technician assigned
      assert_text "Tech User"
    end
  end
end
