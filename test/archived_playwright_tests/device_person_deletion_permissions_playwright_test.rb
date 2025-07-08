ENV["SKIP_FIXTURES"] = "true"
require_relative "../test_helper"
require_relative "../application_playwright_test_case"

class DevicePersonDeletionPermissionsPlaywrightTest < ApplicationPlaywrightTestCase
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

    @person = Person.create!(
      client: @client,
      name: "Test Person"
    )

    @device = Device.create!(
      client: @client,
      name: "Test Device",
      person: @person
    )
  end

  test "owner can delete devices" do
    sign_in_as(@owner)

    visit "/clients/#{@client.id}/devices/#{@device.id}"
    sleep 0.5

    # Verify delete button exists - it's in a form with the delete action
    delete_form = @page.locator("form[action='/clients/#{@client.id}/devices/#{@device.id}'][method='post']")
    delete_button = delete_form.locator("button:has-text('Delete')")
    assert delete_button.visible?, "Owner should see delete button for devices"

    # Click delete button to open modal
    delete_button.click()
    sleep 0.3

    # Handle confirmation in modal
    @page.check("text=I understand this device will be permanently deleted")

    # Click the delete button in the modal
    modal_delete_button = @page.locator("[data-delete-confirmation-target='deleteButton']")
    modal_delete_button.click()
    sleep 1

    # Verify device was deleted
    assert_includes @page.url, "/clients/#{@client.id}/devices"
    assert_raises(ActiveRecord::RecordNotFound) { Device.find(@device.id) }
  end

  test "admin can delete devices" do
    sign_in_as(@admin)

    visit "/clients/#{@client.id}/devices/#{@device.id}"
    sleep 0.5

    # Verify delete button exists - it's in a form with the delete action
    delete_form = @page.locator("form[action='/clients/#{@client.id}/devices/#{@device.id}'][method='post']")
    delete_button = delete_form.locator("button:has-text('Delete')")
    assert delete_button.visible?, "Admin should see delete button for devices"

    # Click delete button to open modal
    delete_button.click()
    sleep 0.3

    # Handle confirmation in modal
    @page.check("text=I understand this device will be permanently deleted")

    # Click the delete button in the modal
    modal_delete_button = @page.locator("[data-delete-confirmation-target='deleteButton']")
    modal_delete_button.click()
    sleep 1

    # Verify device was deleted
    assert_includes @page.url, "/clients/#{@client.id}/devices"
    assert_raises(ActiveRecord::RecordNotFound) { Device.find(@device.id) }
  end

  test "technician cannot delete devices" do
    sign_in_as(@technician)

    visit "/clients/#{@client.id}/devices/#{@device.id}"
    sleep 0.5

    # Verify delete button does NOT exist
    delete_form_exists = @page.locator("form[action='/clients/#{@client.id}/devices/#{@device.id}'][method='post']").count > 0
    assert_not delete_form_exists, "Technician should NOT see delete button for devices"

    # Try to delete via direct API call
    response = @page.evaluate(<<~JS)
      (async () => {
        try {
          const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
          const response = await fetch('/clients/#{@client.id}/devices/#{@device.id}', {
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

    # Verify device still exists
    assert Device.exists?(@device.id), "Device should not be deleted"
  end

  test "customer specialist cannot delete devices" do
    sign_in_as(@customer_specialist)

    visit "/clients/#{@client.id}/devices/#{@device.id}"
    sleep 0.5

    # Verify delete button does NOT exist
    delete_form_exists = @page.locator("form[action='/clients/#{@client.id}/devices/#{@device.id}'][method='post']").count > 0
    assert_not delete_form_exists, "Customer specialist should NOT see delete button for devices"
  end

  test "owner can delete people" do
    sign_in_as(@owner)

    visit "/clients/#{@client.id}/people/#{@person.id}"
    sleep 0.5

    # Verify delete button exists - it's in a form with the delete action
    delete_form = @page.locator("form[action='/clients/#{@client.id}/people/#{@person.id}'][method='post']")
    delete_button = delete_form.locator("button:has-text('Delete')")
    assert delete_button.visible?, "Owner should see delete button for people"

    # Click delete button to open modal
    delete_button.click()
    sleep 0.3

    # Handle confirmation in modal
    @page.check("text=I understand this person will be permanently deleted")

    # Click the delete button in the modal
    modal_delete_button = @page.locator("[data-delete-confirmation-target='deleteButton']")
    modal_delete_button.click()
    sleep 1

    # Verify person was deleted
    assert_includes @page.url, "/clients/#{@client.id}/people"
    assert_raises(ActiveRecord::RecordNotFound) { Person.find(@person.id) }
  end

  test "admin can delete people" do
    sign_in_as(@admin)

    visit "/clients/#{@client.id}/people/#{@person.id}"
    sleep 0.5

    # Verify delete button exists - it's in a form with the delete action
    delete_form = @page.locator("form[action='/clients/#{@client.id}/people/#{@person.id}'][method='post']")
    delete_button = delete_form.locator("button:has-text('Delete')")
    assert delete_button.visible?, "Admin should see delete button for people"

    # Click delete button to open modal
    delete_button.click()
    sleep 0.3

    # Handle confirmation in modal
    @page.check("text=I understand this person will be permanently deleted")

    # Click the delete button in the modal
    modal_delete_button = @page.locator("[data-delete-confirmation-target='deleteButton']")
    modal_delete_button.click()
    sleep 1

    # Verify person was deleted
    assert_includes @page.url, "/clients/#{@client.id}/people"
    assert_raises(ActiveRecord::RecordNotFound) { Person.find(@person.id) }
  end

  test "technician cannot delete people" do
    sign_in_as(@technician)

    visit "/clients/#{@client.id}/people/#{@person.id}"
    sleep 0.5

    # Verify delete button does NOT exist
    delete_form_exists = @page.locator("form[action='/clients/#{@client.id}/people/#{@person.id}'][method='post']").count > 0
    assert_not delete_form_exists, "Technician should NOT see delete button for people"

    # Try to delete via direct API call
    response = @page.evaluate(<<~JS)
      (async () => {
        try {
          const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
          const response = await fetch('/clients/#{@client.id}/people/#{@person.id}', {
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

    # Verify person still exists
    assert Person.exists?(@person.id), "Person should not be deleted"
  end

  test "customer specialist cannot delete people" do
    sign_in_as(@customer_specialist)

    visit "/clients/#{@client.id}/people/#{@person.id}"
    sleep 0.5

    # Verify delete button does NOT exist
    delete_form_exists = @page.locator("form[action='/clients/#{@client.id}/people/#{@person.id}'][method='post']").count > 0
    assert_not delete_form_exists, "Customer specialist should NOT see delete button for people"
  end

  test "delete button hidden in edit views for unauthorized users" do
    sign_in_as(@technician)

    # Check device edit view
    visit "/clients/#{@client.id}/devices/#{@device.id}/edit"
    sleep 0.5
    assert_not @page.locator("text=Delete Device").visible?, "Delete button should be hidden in device edit view for technician"

    # Check person edit view
    visit "/clients/#{@client.id}/people/#{@person.id}/edit"
    sleep 0.5
    assert_not @page.locator("text=Delete Person").visible?, "Delete button should be hidden in person edit view for technician"
  end

  test "delete button visible in edit views for authorized users" do
    sign_in_as(@owner)

    # Check device edit view
    visit "/clients/#{@client.id}/devices/#{@device.id}/edit"
    sleep 0.5
    assert @page.locator("text=Delete Device").visible?, "Delete button should be visible in device edit view for owner"

    # Check person edit view
    visit "/clients/#{@client.id}/people/#{@person.id}/edit"
    sleep 0.5
    assert @page.locator("text=Delete Person").visible?, "Delete button should be visible in person edit view for owner"
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
