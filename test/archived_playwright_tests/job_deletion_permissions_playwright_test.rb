ENV["SKIP_FIXTURES"] = "true"
require_relative "../test_helper"
require_relative "../application_playwright_test_case"

class JobDeletionPermissionsPlaywrightTest < ApplicationPlaywrightTestCase
  setup do
    # Create test users with different roles
    @owner = User.create!(
      name: "Test Owner",
      email: "owner@example.com",
      password: "secret123",
      role: "owner"
    )

    @admin = User.create!(
      name: "Test Admin",
      email: "admin@example.com",
      password: "secret123",
      role: "admin"
    )

    @technician = User.create!(
      name: "Test Technician",
      email: "tech@example.com",
      password: "secret123",
      role: "technician"
    )

    @customer_specialist = User.create!(
      name: "Test Customer Specialist",
      email: "cs@example.com",
      password: "secret123",
      role: "customer_specialist"
    )

    @client = Client.create!(
      name: "Test Client",
      client_type: "residential"
    )

    # Create jobs with different creators
    @job_by_owner = Job.create!(
      client: @client,
      title: "Job Created by Owner",
      status: "cancelled",
      priority: "normal",
      created_by: @owner,
      created_at: 1.hour.ago
    )

    @job_by_admin = Job.create!(
      client: @client,
      title: "Job Created by Admin",
      status: "cancelled",
      priority: "normal",
      created_by: @admin,
      created_at: 1.hour.ago
    )

    @job_by_technician = Job.create!(
      client: @client,
      title: "Job Created by Technician",
      status: "cancelled",
      priority: "normal",
      created_by: @technician,
      created_at: 1.hour.ago
    )

    @recent_job_by_technician = Job.create!(
      client: @client,
      title: "Recent Job Created by Technician",
      status: "cancelled",
      priority: "normal",
      created_by: @technician,
      created_at: 2.minutes.ago
    )

    @job_by_cs = Job.create!(
      client: @client,
      title: "Job Created by Customer Specialist",
      status: "cancelled",
      priority: "normal",
      created_by: @customer_specialist,
      created_at: 1.hour.ago
    )
  end

  test "owner can delete any job" do
    sign_in_as(@owner)

    # Owner should be able to delete job created by anyone
    visit "/clients/#{@client.id}/jobs/#{@job_by_technician.id}"
    sleep 0.5

    # Open the job popover
    @page.click('button[data-action="click->header-job#toggleJobPopover"]')
    sleep 0.3

    # Verify delete button exists in popover
    delete_button_exists = @page.evaluate(<<~JS)
      (() => {
        const popover = document.querySelector('.job-popover');
        if (!popover) return false;
        const buttons = popover.querySelectorAll('button');
        return Array.from(buttons).some(btn => btn.textContent.includes('Delete Job'));
      })()
    JS

    assert delete_button_exists, "Owner should see delete button"

    # Set up dialog handler before clicking
    dialog_accepted = false
    @page.on("dialog", ->(dialog) {
      assert_includes dialog.message, "Are you sure"
      dialog.accept
      dialog_accepted = true
    })

    # Click delete button
    @page.click('.job-popover button:has-text("Delete Job")')

    sleep 1 # Wait for redirect

    assert dialog_accepted, "Confirmation dialog should have been shown and accepted"

    # Verify job was deleted and we're redirected
    assert_includes @page.url, "/clients/#{@client.id}/jobs"

    # Verify job no longer exists
    assert_raises(ActiveRecord::RecordNotFound) { Job.find(@job_by_technician.id) }
  end

  test "admin cannot delete job created by others" do
    sign_in_as(@admin)

    # Admin should NOT be able to delete job created by owner
    visit "/clients/#{@client.id}/jobs/#{@job_by_owner.id}"
    sleep 0.5

    # Open the job popover
    @page.click('button[data-action="click->header-job#toggleJobPopover"]')
    sleep 0.3

    # Verify delete button does NOT exist in popover
    delete_button_exists = @page.evaluate(<<~JS)
      (() => {
        const popover = document.querySelector('.job-popover');
        if (!popover) return false;
        const buttons = popover.querySelectorAll('button');
        return Array.from(buttons).some(btn => btn.textContent.includes('Delete Job'));
      })()
    JS

    assert_not delete_button_exists, "Admin should NOT see delete button for jobs created by others"
  end

  test "admin can delete own job within 5 minutes" do
    # Create a fresh job for this test
    recent_job_by_admin = Job.create!(
      client: @client,
      title: "Recent Job by Admin",
      status: "cancelled",
      priority: "normal",
      created_by: @admin,
      created_at: 2.minutes.ago
    )

    sign_in_as(@admin)

    visit "/clients/#{@client.id}/jobs/#{recent_job_by_admin.id}"
    sleep 0.5

    # Open the job popover
    @page.click('button[data-action="click->header-job#toggleJobPopover"]')
    sleep 0.3

    # Verify delete button exists
    delete_button_exists = @page.evaluate(<<~JS)
      (() => {
        const popover = document.querySelector('.job-popover');
        if (!popover) return false;
        const buttons = popover.querySelectorAll('button');
        return Array.from(buttons).some(btn => btn.textContent.includes('Delete Job'));
      })()
    JS

    assert delete_button_exists, "Admin should see delete button for own recent job"

    # Set up dialog handler
    @page.on("dialog", ->(dialog) { dialog.accept })

    # Click delete button
    @page.click('.job-popover button:has-text("Delete Job")')

    sleep 1 # Wait for redirect

    # Verify job was deleted
    assert_includes @page.url, "/clients/#{@client.id}/jobs"
    assert_raises(ActiveRecord::RecordNotFound) { Job.find(recent_job_by_admin.id) }
  end

  test "technician cannot delete job created by others" do
    sign_in_as(@technician)

    # Technician should NOT be able to delete job created by admin
    visit "/clients/#{@client.id}/jobs/#{@job_by_admin.id}"
    sleep 0.5

    # Open the job popover
    @page.click('button[data-action="click->header-job#toggleJobPopover"]')
    sleep 0.3

    # Verify delete button does NOT exist in popover
    delete_button_exists = @page.evaluate(<<~JS)
      (() => {
        const popover = document.querySelector('.job-popover');
        if (!popover) return false;
        const buttons = popover.querySelectorAll('button');
        return Array.from(buttons).some(btn => btn.textContent.includes('Delete Job'));
      })()
    JS

    assert_not delete_button_exists, "Technician should NOT see delete button for others' jobs"

    # Try to delete via direct URL using fetch
    response = @page.evaluate(<<~JS)
      (async () => {
        try {
          const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
          const response = await fetch('/clients/#{@client.id}/jobs/#{@job_by_admin.id}', {
            method: 'DELETE',
            headers: {
              'X-CSRF-Token': csrfToken,
              'Accept': 'text/html'
            },
            redirect: 'manual'
          });
          return {
            status: response.status,
            redirected: response.type === 'opaqueredirect'
          };
        } catch (error) {
          return { error: error.message };
        }
      })()
    JS

    sleep 0.5

    # The request should be redirected (302) due to lack of permission
    assert response["redirected"] || response["status"] == 302, "Request should be redirected due to lack of permission"

    # Verify job still exists
    assert Job.exists?(@job_by_admin.id), "Job should not be deleted"
  end

  test "technician can delete own job within 5 minutes" do
    sign_in_as(@technician)

    # Technician should be able to delete their recent job
    visit "/clients/#{@client.id}/jobs/#{@recent_job_by_technician.id}"
    sleep 0.5

    # Open the job popover
    @page.click('button[data-action="click->header-job#toggleJobPopover"]')
    sleep 0.3

    # Verify delete button exists
    delete_button_exists = @page.evaluate(<<~JS)
      (() => {
        const popover = document.querySelector('.job-popover');
        if (!popover) return false;
        const buttons = popover.querySelectorAll('button');
        return Array.from(buttons).some(btn => btn.textContent.includes('Delete Job'));
      })()
    JS

    assert delete_button_exists, "Technician should see delete button for own recent job"

    # Set up dialog handler
    @page.on("dialog", ->(dialog) { dialog.accept })

    # Click delete button
    @page.click('.job-popover button:has-text("Delete Job")')

    sleep 1 # Wait for redirect

    # Verify job was deleted
    assert_includes @page.url, "/clients/#{@client.id}/jobs"
    assert_raises(ActiveRecord::RecordNotFound) { Job.find(@recent_job_by_technician.id) }
  end

  test "technician cannot delete own job after 5 minutes" do
    sign_in_as(@technician)

    # Technician should NOT be able to delete their old job
    visit "/clients/#{@client.id}/jobs/#{@job_by_technician.id}"
    sleep 0.5

    # Open the job popover
    @page.click('button[data-action="click->header-job#toggleJobPopover"]')
    sleep 0.3

    # Verify delete button does NOT exist
    delete_button_exists = @page.evaluate(<<~JS)
      (() => {
        const popover = document.querySelector('.job-popover');
        if (!popover) return false;
        const buttons = popover.querySelectorAll('button');
        return Array.from(buttons).some(btn => btn.textContent.includes('Delete Job'));
      })()
    JS

    assert_not delete_button_exists, "Technician should NOT see delete button for own old job"
  end

  test "customer specialist cannot delete job created by others" do
    sign_in_as(@customer_specialist)

    # Customer specialist should NOT be able to delete job created by admin
    visit "/clients/#{@client.id}/jobs/#{@job_by_admin.id}"
    sleep 0.5

    # Open the job popover
    @page.click('button[data-action="click->header-job#toggleJobPopover"]')
    sleep 0.3

    # Verify delete button does NOT exist
    delete_button_exists = @page.evaluate(<<~JS)
      (() => {
        const popover = document.querySelector('.job-popover');
        if (!popover) return false;
        const buttons = popover.querySelectorAll('button');
        return Array.from(buttons).some(btn => btn.textContent.includes('Delete Job'));
      })()
    JS

    assert_not delete_button_exists, "Customer specialist should NOT see delete button for others' jobs"
  end

  test "customer specialist can delete own job within 5 minutes" do
    # Create a fresh job for this test
    recent_job_by_cs = Job.create!(
      client: @client,
      title: "Recent Job by CS",
      status: "cancelled",
      priority: "normal",
      created_by: @customer_specialist,
      created_at: 2.minutes.ago
    )

    sign_in_as(@customer_specialist)

    visit "/clients/#{@client.id}/jobs/#{recent_job_by_cs.id}"
    sleep 0.5

    # Open the job popover
    @page.click('button[data-action="click->header-job#toggleJobPopover"]')
    sleep 0.3

    # Verify delete button exists
    delete_button_exists = @page.evaluate(<<~JS)
      (() => {
        const popover = document.querySelector('.job-popover');
        if (!popover) return false;
        const buttons = popover.querySelectorAll('button');
        return Array.from(buttons).some(btn => btn.textContent.includes('Delete Job'));
      })()
    JS

    assert delete_button_exists, "Customer specialist should see delete button for own recent job"

    # Set up dialog handler
    @page.on("dialog", ->(dialog) { dialog.accept })

    # Click delete button
    @page.click('.job-popover button:has-text("Delete Job")')

    sleep 1 # Wait for redirect

    # Verify job was deleted
    assert_includes @page.url, "/clients/#{@client.id}/jobs"
    assert_raises(ActiveRecord::RecordNotFound) { Job.find(recent_job_by_cs.id) }
  end

  test "delete button visibility reflects permissions correctly" do
    # Test with each user type
    users_and_expectations = [
      [ @owner, true, "Owner should always see delete button" ],
      [ @admin, false, "Admin should not see delete button for jobs created by others" ],
      [ @technician, false, "Technician should not see delete button for old jobs" ],
      [ @customer_specialist, false, "Customer specialist should not see delete button for old jobs" ]
    ]

    users_and_expectations.each_with_index do |(user, should_see_button, message), index|
      puts "\n=== Testing user #{index + 1}/#{users_and_expectations.length}: #{user.role} (#{user.email}) ==="

      sign_in_as(user)

      visit "/clients/#{@client.id}/jobs/#{@job_by_admin.id}"
      sleep 0.5

      # Open the job popover
      @page.click('button[data-action="click->header-job#toggleJobPopover"]')
      sleep 0.3

      # Debug: Check what buttons are in the popover
      button_info = @page.evaluate(<<~JS)
        (() => {
          const popover = document.querySelector('.job-popover');
          if (!popover) return { popoverFound: false };

          const buttons = popover.querySelectorAll('button');
          const buttonTexts = Array.from(buttons).map(btn => btn.textContent.trim());
          const hasDeleteButton = buttonTexts.some(text => text.includes('Delete Job'));

          return {
            popoverFound: true,
            buttonCount: buttons.length,
            buttonTexts: buttonTexts,
            hasDeleteButton: hasDeleteButton
          };
        })()
      JS

      puts "Popover found: #{button_info['popoverFound']}"
      puts "Button count: #{button_info['buttonCount']}"
      puts "Button texts: #{button_info['buttonTexts'].inspect}"
      puts "Has delete button: #{button_info['hasDeleteButton']}"
      puts "Expected to see button: #{should_see_button}"

      if should_see_button
        assert button_info["hasDeleteButton"], message
      else
        assert_not button_info["hasDeleteButton"], message
      end

      # Close popover
      @page.keyboard.press("Escape")
      sleep 0.2

      # Sign out for next iteration
      @page.click('button[data-action*="toggleUserMenu"]')
      sleep 0.2
      @page.click("text=Sign Out")
      sleep 0.5
    end
  end

  test "activity log records job deletion with correct metadata" do
    sign_in_as(@owner)

    job_title = @job_by_technician.title
    job_id = @job_by_technician.id

    visit "/clients/#{@client.id}/jobs/#{job_id}"
    sleep 0.5

    # Open the job popover
    @page.click('button[data-action="click->header-job#toggleJobPopover"]')
    sleep 0.3

    # Set up dialog handler
    @page.on("dialog", ->(dialog) { dialog.accept })

    # Click delete button
    @page.click('.job-popover button:has-text("Delete Job")')

    sleep 1 # Wait for deletion and redirect

    # Check activity log
    activity = ActivityLog.where(
      user: @owner,
      action: "deleted",
      loggable_type: "Job",
      loggable_id: job_id
    ).last

    assert_not_nil activity, "Activity log should be created for job deletion"
    assert_equal job_title, activity.metadata["job_title"]
    assert_equal @client.name, activity.metadata["client_name"]
  end

  # SERVER-SIDE ENFORCEMENT TESTS

  test "server enforces admin cannot delete job created by others" do
    sign_in_as(@admin)
    job_id = @job_by_owner.id

    visit "/clients/#{@client.id}/jobs/#{job_id}"
    sleep 0.5

    # Try to delete via direct API call
    response = @page.evaluate(<<~JS)
      (async () => {
        try {
          const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
          const response = await fetch('/clients/#{@client.id}/jobs/#{job_id}', {
            method: 'DELETE',
            headers: {
              'X-CSRF-Token': csrfToken,
              'Accept': 'text/html'
            },
            redirect: 'manual'
          });
          return {
            status: response.status,
            redirected: response.type === 'opaqueredirect',
            url: response.url
          };
        } catch (error) {
          return { error: error.message };
        }
      })()
    JS

    sleep 0.5

    # Should be redirected with permission error
    assert response["redirected"] || response["status"] == 302, "Request should be redirected due to lack of permission"

    # Verify job still exists
    assert Job.exists?(job_id), "Job should not be deleted when admin tries to delete job created by others"
  end

  test "server enforces customer specialist cannot delete job created by others" do
    sign_in_as(@customer_specialist)
    job_id = @job_by_admin.id

    visit "/clients/#{@client.id}/jobs/#{job_id}"
    sleep 0.5

    # Try to delete via direct API call
    response = @page.evaluate(<<~JS)
      (async () => {
        try {
          const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
          const response = await fetch('/clients/#{@client.id}/jobs/#{job_id}', {
            method: 'DELETE',
            headers: {
              'X-CSRF-Token': csrfToken,
              'Accept': 'text/html'
            },
            redirect: 'manual'
          });
          return {
            status: response.status,
            redirected: response.type === 'opaqueredirect'
          };
        } catch (error) {
          return { error: error.message };
        }
      })()
    JS

    sleep 0.5

    # Should be redirected with permission error
    assert response["redirected"] || response["status"] == 302, "Request should be redirected due to lack of permission"

    # Verify job still exists
    assert Job.exists?(job_id), "Job should not be deleted when customer specialist tries to delete job created by others"
  end

  test "server enforces technician cannot delete own old job" do
    sign_in_as(@technician)
    job_id = @job_by_technician.id  # This is an old job (created 1 hour ago)

    visit "/clients/#{@client.id}/jobs/#{job_id}"
    sleep 0.5

    # Try to delete via direct API call
    response = @page.evaluate(<<~JS)
      (async () => {
        try {
          const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
          const response = await fetch('/clients/#{@client.id}/jobs/#{job_id}', {
            method: 'DELETE',
            headers: {
              'X-CSRF-Token': csrfToken,
              'Accept': 'text/html'
            },
            redirect: 'manual'
          });
          return {
            status: response.status,
            redirected: response.type === 'opaqueredirect'
          };
        } catch (error) {
          return { error: error.message };
        }
      })()
    JS

    sleep 0.5

    # Should be redirected with permission error
    assert response["redirected"] || response["status"] == 302, "Request should be redirected due to lack of permission"

    # Verify job still exists
    assert Job.exists?(job_id), "Job should not be deleted when technician tries to delete own old job"
  end

  test "server enforces admin cannot delete own old job" do
    sign_in_as(@admin)
    job_id = @job_by_admin.id  # This is an old job (created 1 hour ago)

    visit "/clients/#{@client.id}/jobs/#{job_id}"
    sleep 0.5

    # Try to delete via direct API call
    response = @page.evaluate(<<~JS)
      (async () => {
        try {
          const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
          const response = await fetch('/clients/#{@client.id}/jobs/#{job_id}', {
            method: 'DELETE',
            headers: {
              'X-CSRF-Token': csrfToken,
              'Accept': 'text/html'
            },
            redirect: 'manual'
          });
          return {
            status: response.status,
            redirected: response.type === 'opaqueredirect'
          };
        } catch (error) {
          return { error: error.message };
        }
      })()
    JS

    sleep 0.5

    # Should be redirected with permission error
    assert response["redirected"] || response["status"] == 302, "Request should be redirected due to lack of permission"

    # Verify job still exists
    assert Job.exists?(job_id), "Job should not be deleted when admin tries to delete own old job"
  end

  test "server enforces customer specialist cannot delete own old job" do
    sign_in_as(@customer_specialist)
    job_id = @job_by_cs.id  # This is an old job (created 1 hour ago)

    visit "/clients/#{@client.id}/jobs/#{job_id}"
    sleep 0.5

    # Try to delete via direct API call
    response = @page.evaluate(<<~JS)
      (async () => {
        try {
          const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
          const response = await fetch('/clients/#{@client.id}/jobs/#{job_id}', {
            method: 'DELETE',
            headers: {
              'X-CSRF-Token': csrfToken,
              'Accept': 'text/html'
            },
            redirect: 'manual'
          });
          return {
            status: response.status,
            redirected: response.type === 'opaqueredirect'
          };
        } catch (error) {
          return { error: error.message };
        }
      })()
    JS

    sleep 0.5

    # Should be redirected with permission error
    assert response["redirected"] || response["status"] == 302, "Request should be redirected due to lack of permission"

    # Verify job still exists
    assert Job.exists?(job_id), "Job should not be deleted when customer specialist tries to delete own old job"
  end

  test "server allows owner to delete any job via API" do
    sign_in_as(@owner)
    # Create a new job for this specific test to avoid conflicts
    job_to_delete = Job.create!(
      client: @client,
      title: "Job to Delete by Owner",
      status: "cancelled",
      priority: "normal",
      created_by: @admin,
      created_at: 1.hour.ago
    )
    job_id = job_to_delete.id

    visit "/clients/#{@client.id}/jobs/#{job_id}"
    sleep 0.5

    # Verify job exists before deletion
    assert Job.exists?(job_id), "Job should exist before deletion"

    # Try to delete via direct API call
    response = @page.evaluate(<<~JS)
      (async () => {
        try {
          const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
          const response = await fetch('/clients/#{@client.id}/jobs/#{job_id}', {
            method: 'DELETE',
            headers: {
              'X-CSRF-Token': csrfToken,
              'Accept': 'application/json, text/html'
            },
            redirect: 'manual'
          });
      #{'    '}
          // For successful deletion, Rails will redirect
          if (response.type === 'opaqueredirect' || response.status === 302) {
            return {
              status: 'success',
              redirected: true
            };
          }
      #{'    '}
          return {
            status: response.status,
            redirected: false
          };
        } catch (error) {
          return { error: error.message };
        }
      })()
    JS

    sleep 1

    # Should be redirected after successful deletion
    assert response["redirected"], "Owner should be able to delete any job (request should redirect)"
    assert_equal "success", response["status"], "Deletion should be successful"

    # Verify job was deleted
    assert_not Job.exists?(job_id), "Job should be deleted when owner deletes it"
  end

  test "delete button hidden for non-cancelled jobs" do
    # Create a non-cancelled job
    active_job = Job.create!(
      client: @client,
      title: "Active Job",
      status: "in_progress",
      priority: "normal",
      created_by: @owner,
      created_at: 1.hour.ago
    )

    sign_in_as(@owner)

    visit "/clients/#{@client.id}/jobs/#{active_job.id}"
    sleep 0.5

    # Open the job popover
    @page.click('button[data-action="click->header-job#toggleJobPopover"]')
    sleep 0.3

    # Verify delete button does NOT exist even for owner
    delete_button_exists = @page.evaluate(<<~JS)
      (() => {
        const popover = document.querySelector('.job-popover');
        if (!popover) return false;
        const buttons = popover.querySelectorAll('button');
        return Array.from(buttons).some(btn => btn.textContent.includes('Delete Job'));
      })()
    JS

    assert_not delete_button_exists, "Owner should not see delete button for non-cancelled job"
  end

  test "server enforces job must be cancelled before deletion" do
    # Create a non-cancelled job
    active_job = Job.create!(
      client: @client,
      title: "Active Job to Try Deleting",
      status: "in_progress",
      priority: "normal",
      created_by: @owner,
      created_at: 1.hour.ago
    )
    job_id = active_job.id

    sign_in_as(@owner)

    visit "/clients/#{@client.id}/jobs/#{job_id}"
    sleep 0.5

    # Try to delete via direct API call
    response = @page.evaluate(<<~JS)
      (async () => {
        try {
          const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
          const response = await fetch('/clients/#{@client.id}/jobs/#{job_id}', {
            method: 'DELETE',
            headers: {
              'X-CSRF-Token': csrfToken,
              'Accept': 'text/html'
            },
            redirect: 'manual'
          });
          return {
            status: response.status,
            redirected: response.type === 'opaqueredirect'
          };
        } catch (error) {
          return { error: error.message };
        }
      })()
    JS

    sleep 0.5

    # Should be redirected with error message
    assert response["redirected"] || response["status"] == 302, "Request should be redirected"

    # Verify job still exists
    assert Job.exists?(job_id), "Job should not be deleted when it's not cancelled"

    # Verify job status hasn't changed
    active_job.reload
    assert_equal "in_progress", active_job.status, "Job status should remain unchanged"
  end

  private

  def sign_in_as(user)
    visit "/login"
    fill_in "Email", with: user.email
    fill_in "Password", with: "secret123"
    click_on "Sign In"
    sleep 0.5
  end
end
