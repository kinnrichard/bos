# Simple Login Test - Validates basic Playwright integration
require "test_helper"
require "application_playwright_test_case"

class SimpleLoginTest < ApplicationPlaywrightTestCase
  test "can navigate to login page and see form" do
    # Navigate to login page
    visit "/login"

    # Check for login form elements
    assert_text "Sign In"

    # Take a screenshot for debugging
    take_screenshot("login_page")

    puts "✅ Successfully loaded login page"
  end

  test "can login with test user" do
    # Use our test credentials
    credentials = TestEnvironment.test_credentials(:admin)

    # Navigate to login page
    visit "/login"

    # Fill in login form
    fill_in "Email", with: credentials[:email]
    fill_in "Password", with: credentials[:password]

    # Submit form
    click_on "Sign In"

    # Wait for navigation
    wait_for_navigation

    # Take screenshot of result
    take_screenshot("after_login")

    puts "✅ Successfully logged in as #{credentials[:email]}"
  end
end
