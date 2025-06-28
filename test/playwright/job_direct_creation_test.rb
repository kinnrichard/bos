require_relative "../application_playwright_test_case"

class JobDirectCreationTest < ApplicationPlaywrightTestCase
  setup do
    # Create test users
    @admin = User.create!(
      name: "Admin User",
      first_name: "Admin",
      email: "admin@example.com",
      password: "password123",
      role: "admin"
    )

    @john = User.create!(
      name: "John Doe",
      first_name: "John",
      email: "john@example.com",
      password: "password123",
      role: "technician"
    )

    @client = Client.create!(
      name: "Test Client",
      email: "client@example.com",
      phone: "555-0123"
    )
  end

  test "creates job directly and shows untitled job with pulsing" do
    sign_in_as(@admin)

    # Navigate to client
    visit "/clients/#{@client.id}"
    wait_for_navigation

    # Click new job button
    @page.click("text=New Job")
    wait_for_navigation

    # Should be on job page, not new job form
    assert @page.url.include?("/jobs/")
    refute @page.url.include?("/new")

    # Title should be "Admin's Untitled Job" and pulsing
    title_element = @page.locator(".job-title")
    assert_equal "Admin's Untitled Job", title_element.text_content.strip

    # Check for pulsing animation class
    assert title_element.evaluate("el => el.classList.contains('untitled-pulse')")

    # Title should have autofocus
    assert title_element.evaluate("el => el === document.activeElement")
  end

  test "pulsing stops when user focuses the field" do
    sign_in_as(@john)

    # Create a job with untitled name
    @job = Job.create!(
      title: "John's Untitled Job",
      client: @client,
      created_by: @john,
      status: "open",
      priority: "normal"
    )

    visit "/clients/#{@client.id}/jobs/#{@job.id}"
    wait_for_navigation

    title_element = @page.locator(".job-title")

    # Should be pulsing initially
    assert title_element.evaluate("el => el.classList.contains('untitled-pulse')")

    # Click somewhere else to blur
    @page.click(".tasks-container")
    sleep 0.5

    # Should still be pulsing
    assert title_element.evaluate("el => el.classList.contains('untitled-pulse')")

    # Focus the title field
    title_element.click
    sleep 0.5

    # Pulsing should stop
    refute title_element.evaluate("el => el.classList.contains('untitled-pulse')")
  end

  test "saves title when user types and blurs" do
    sign_in_as(@admin)

    # Create an untitled job
    @job = Job.create!(
      title: "Admin's Untitled Job",
      client: @client,
      created_by: @admin,
      status: "open",
      priority: "normal"
    )

    visit "/clients/#{@client.id}/jobs/#{@job.id}"
    wait_for_navigation

    title_element = @page.locator(".job-title")

    # Clear and type new title
    title_element.click
    title_element.evaluate("el => el.textContent = ''")
    title_element.type("Setup New Server")

    # Blur to trigger save
    @page.click(".tasks-container")
    sleep 1 # Wait for auto-save

    # Reload to verify save
    @page.reload
    wait_for_navigation

    # Title should be saved
    assert_equal "Setup New Server", @page.locator(".job-title").text_content.strip

    # Should not be pulsing anymore
    refute @page.locator(".job-title").evaluate("el => el.classList.contains('untitled-pulse')")
  end

  test "handles duplicate untitled jobs with numbering" do
    sign_in_as(@john)

    # Create first untitled job
    @job1 = Job.create!(
      title: "John's Untitled Job",
      client: @client,
      created_by: @john,
      status: "open",
      priority: "normal"
    )

    # Navigate to client and create another job
    visit "/clients/#{@client.id}"
    wait_for_navigation

    @page.click("text=New Job")
    wait_for_navigation

    # Second job should have (2) suffix
    title_element = @page.locator(".job-title")
    assert_equal "John's Untitled Job (2)", title_element.text_content.strip
  end

  test "restores placeholder when title is cleared" do
    sign_in_as(@admin)

    # Create a job with a real title
    @job = Job.create!(
      title: "Real Job Title",
      client: @client,
      created_by: @admin,
      status: "open",
      priority: "normal"
    )

    visit "/clients/#{@client.id}/jobs/#{@job.id}"
    wait_for_navigation

    title_element = @page.locator(".job-title")

    # Clear the title
    title_element.click
    title_element.evaluate("el => el.textContent = ''")

    # Blur
    @page.click(".tasks-container")
    sleep 0.5

    # Should show placeholder and start pulsing
    assert_equal "Admin's Untitled Job", title_element.text_content.strip
    assert title_element.evaluate("el => el.classList.contains('untitled-pulse')")
  end
end
