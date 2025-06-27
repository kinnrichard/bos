require "application_playwright_test_case"

class FeedbackFormsPlaywrightTest < ApplicationPlaywrightTestCase
  setup do
    @user = User.create!(
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      role: "admin"
    )
  end

  test "feature request form displays correctly and is interactive" do
    # Sign in
    visit "/login"
    page.fill('[name="email"]', @user.email)
    page.fill('[name="password"]', "password123")
    page.click('button[type="submit"]')

    # Wait for redirect and open user menu
    user_avatar = page.wait_for_selector(".user-menu-button")
    user_avatar.click()

    # Wait for popover to open
    page.wait_for_selector(".user-menu-popover:not(.hidden)", state: "visible")

    # Click request feature
    feature_link = page.wait_for_selector('a[href*="type=feature"]')
    feature_link.click

    # Wait for modal to appear
    page.wait_for_selector(".modal-backdrop:not(.hidden)")

    # Check that form elements are visible
    assert page.visible?(".modal-container")
    assert page.visible?(".modal-header h2")
    assert_equal "Request a Feature", page.text_content(".modal-header h2")

    # Check first screen is visible
    assert page.visible?(".form-screen.active")
    assert page.visible?(".form-input__label")

    # Fill in first screen
    what_input = page.wait_for_selector('input[name="what_to_improve"]')
    what_input.fill("Add dark mode toggle")

    # Select importance level
    importance_radio = page.wait_for_selector('input[value="Would really help my workflow"]')
    importance_radio.click

    # Click next
    next_button = page.wait_for_selector('[data-feature-request-target="nextButton"]')
    next_button.click

    # Check second screen appears
    page.wait_for_selector('.form-screen.active textarea[name="problem_description"]')

    # Test navigation back
    back_button = page.wait_for_selector('[data-feature-request-target="backButton"]')
    assert page.visible?('[data-feature-request-target="backButton"]')
    back_button.click

    # Should be back on first screen
    assert page.visible?('input[name="what_to_improve"]')

    # Test close button
    close_button = page.wait_for_selector(".modal-close")
    close_button.click

    # Modal should be hidden - wait for it to disappear
    page.wait_for_selector(".modal-backdrop", state: "hidden")
  end

  test "bug report form displays correctly with screenshot capture" do
    # Sign in
    visit "/login"
    page.fill('[name="email"]', @user.email)
    page.fill('[name="password"]', "password123")
    page.click('button[type="submit"]')

    # Wait for redirect and open user menu
    user_avatar = page.wait_for_selector(".user-menu-button")
    user_avatar.click()

    # Wait for popover to open
    page.wait_for_selector(".user-menu-popover:not(.hidden)", state: "visible")

    # Click report bug
    bug_link = page.wait_for_selector('a[href*="type=bug"]')
    bug_link.click

    # Wait for modal to appear
    page.wait_for_selector(".modal-backdrop:not(.hidden)")

    # Check that form elements are visible
    assert page.visible?(".modal-container")
    assert page.visible?(".modal-header h2")
    assert_equal "Report a Bug", page.text_content(".modal-header h2")

    # Check form inputs are visible
    assert page.visible?(".form-input__label")
    assert page.visible?('input[name="title"]')
    assert page.visible?('textarea[name="description"]')

    # Fill in form
    title_input = page.wait_for_selector('input[name="title"]')
    title_input.fill("Test bug report")

    description_input = page.wait_for_selector('textarea[name="description"]')
    description_input.fill("This is a test bug description")

    # Check screenshot preview area
    assert page.visible?(".screenshot-preview")

    # Test close button
    close_button = page.wait_for_selector(".modal-close")
    close_button.click

    # Modal should be hidden - wait for it to disappear
    page.wait_for_selector(".modal-backdrop", state: "hidden")
  end
end
