ENV["SKIP_FIXTURES"] = "true"
require "application_playwright_test_case"

class SessionsPlaywrightTest < ApplicationPlaywrightTestCase
  setup do
    # Create a test user with known credentials
    @user = User.create!(
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      role: "admin"
    )
  end

  test "successful login flow" do
    # Visit the login page
    visit "/login"
    
    # Verify we're on the login page
    assert_text "Sign In"
    
    # Fill in the login form
    fill_in "Email", with: "test@example.com"
    fill_in "Password", with: "password123"
    
    # Take a screenshot before submitting
    take_screenshot("before_login") if ENV["SCREENSHOT"]
    
    # Submit the form
    click_on "Sign In"
    
    # Wait for navigation
    wait_for_navigation
    
    # Verify successful login
    assert_current_path "/"
    
    # Verify we see the user's greeting
    assert_text "Good morning, Test User!"
    
    # Verify user is shown in the header
    assert_text "Test User"
    assert_text "Admin"  # User role
    
    # Take a screenshot after successful login
    take_screenshot("after_login") if ENV["SCREENSHOT"]
  end

  test "failed login with invalid credentials" do
    visit "/login"
    
    # Fill in with invalid credentials
    fill_in "Email", with: "test@example.com"
    fill_in "Password", with: "wrongpassword"
    
    click_on "Sign In"
    
    # Should still be on login page
    assert_text "Invalid email or password"
    assert_text "Sign In"
    
    # Verify form fields are preserved
    assert_equal "test@example.com", @page.input_value("#email")
  end

  test "redirect to login when accessing protected page" do
    # Try to visit a protected page
    visit "/jobs"
    
    # Should be redirected to login
    assert_current_path "/login"
    assert_text "Sign In"
    
    # Login
    fill_in "Email", with: @user.email
    fill_in "Password", with: "password123"
    click_on "Sign In"
    
    # Should be redirected back to the originally requested page
    wait_for_navigation
    assert_current_path "/jobs"
  end

  test "logout flow" do
    # First, sign in
    sign_in_as(@user)
    
    # Verify we're logged in
    assert_current_path "/"
    
    # Find and click logout (this might be in a dropdown)
    # Adjust selector based on your actual UI
    @page.click("[data-controller='dropdown'] button") # Open user menu if in dropdown
    click_on "Sign out"
    
    # Should be redirected to login page
    wait_for_navigation
    assert_current_path "/login"
    assert_text "You have been logged out"
    
    # Try to visit protected page - should redirect to login
    visit "/jobs"
    assert_current_path "/login"
  end

  test "login form validation" do
    visit "/login"
    
    # Try to submit empty form
    click_on "Sign In"
    
    # HTML5 validation should prevent submission
    # Check that we're still on the login page
    assert_text "Sign In"
    
    # Check for browser validation messages
    email_validity = @page.evaluate("document.querySelector('#email').validity.valid")
    assert_equal false, email_validity
  end

  test "login persists across page refreshes" do
    # Login
    sign_in_as(@user)
    assert_current_path "/"
    
    # Refresh the page
    refresh
    wait_for_navigation
    
    # Should still be logged in
    assert_current_path "/"
    assert_text "Test User"
    
    # Navigate to another page
    visit "/clients"
    wait_for_navigation
    
    # Should still be logged in
    assert_text "Test User"
  end

  test "handles login with Stimulus controllers" do
    visit "/login"
    
    # If there are any Stimulus controllers on the login page, wait for them
    # For example, if there's a form validation controller
    # wait_for_stimulus("form-validation") 
    
    # Test any dynamic behavior
    # For example, password visibility toggle if implemented
    password_field = @page.locator("#password")
    assert_equal "password", password_field.get_attribute("type")
    
    # Continue with normal login
    fill_in "Email", with: @user.email
    fill_in "Password", with: "password123"
    click_on "Sign In"
    
    wait_for_navigation
    assert_current_path "/"
  end

  test "responsive login page" do
    # Test mobile viewport
    @context.set_viewport_size(width: 375, height: 667)
    
    visit "/login"
    
    # Verify all elements are still accessible
    assert_text "Sign In"
    
    # Form should still be usable
    fill_in "Email", with: @user.email
    fill_in "Password", with: "password123"
    
    take_screenshot("mobile_login") if ENV["SCREENSHOT"]
    
    click_on "Sign In"
    wait_for_navigation
    assert_current_path "/"
    
    # Reset viewport
    @context.set_viewport_size(width: 1400, height: 900)
  end
end