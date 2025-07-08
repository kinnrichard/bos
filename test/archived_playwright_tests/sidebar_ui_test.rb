require "application_playwright_test_case"

class SidebarUiTest < ApplicationPlaywrightTestCase
  setup do
    @user = User.create!(
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      role: "admin"
    )

    @client = Client.create!(
      name: "Test Client",
      email: "client@example.com",
      phone: "555-0123"
    )
  end

  test "sidebar close button appears on hover and hides sidebar" do
    sign_in_as(@user)

    visit "/"
    wait_for_navigation

    # Sidebar should be visible by default
    assert @page.locator(".sidebar").visible?
    assert @page.locator(".sidebar").evaluate("el => !el.classList.contains('sidebar-hidden')")

    # Close button should not be visible initially
    close_btn = @page.locator(".sidebar-close-btn")
    assert close_btn.evaluate("el => window.getComputedStyle(el).opacity === '0'")

    # Hover over sidebar logo area to show close button
    @page.hover(".sidebar-logo-section")

    # Close button should become visible with gray background
    assert close_btn.evaluate("el => window.getComputedStyle(el).opacity === '1'")

    # Click the close button
    close_btn.click

    # Wait for animation
    @page.wait_for_timeout(400)

    # Sidebar should be hidden
    assert @page.locator(".sidebar").evaluate("el => el.classList.contains('sidebar-hidden')")

    # Show sidebar button should appear in toolbar
    assert @page.locator("[data-action='click->sidebar#show']").visible?
  end

  test "sidebar remembers hidden state on page reload without animation" do
    sign_in_as(@user)

    visit "/"
    wait_for_navigation

    # Hide the sidebar
    @page.hover(".sidebar-logo-section")
    @page.locator(".sidebar-close-btn").click
    @page.wait_for_timeout(400)

    # Verify sidebar is hidden
    assert @page.locator(".sidebar").evaluate("el => el.classList.contains('sidebar-hidden')")

    # Reload the page
    @page.reload
    wait_for_navigation

    # Check that sidebar has no-transition class initially
    sidebar = @page.locator(".sidebar")

    # Sidebar should be hidden without animation
    assert sidebar.evaluate("el => el.classList.contains('sidebar-hidden')")
    assert sidebar.evaluate("el => el.classList.contains('no-transition')")

    # After a brief moment, no-transition class should be removed
    @page.wait_for_timeout(100)
    assert sidebar.evaluate("el => !el.classList.contains('no-transition')")
  end

  test "sidebar navigation items have no hover effects" do
    sign_in_as(@user)

    visit "/"
    wait_for_navigation

    # Get a sidebar item
    sidebar_item = @page.locator(".sidebar-item").first

    # Get initial background color
    initial_bg = sidebar_item.evaluate("el => window.getComputedStyle(el).backgroundColor")

    # Hover over the item
    sidebar_item.hover
    @page.wait_for_timeout(200)

    # Background color should not change on hover
    hover_bg = sidebar_item.evaluate("el => window.getComputedStyle(el).backgroundColor")
    assert_equal initial_bg, hover_bg
  end
end
