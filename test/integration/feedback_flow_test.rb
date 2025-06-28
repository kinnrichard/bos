require "test_helper"
require "playwright_test_case"

class FeedbackFlowTest < ApplicationPlaywrightTestCase
  def setup
    super
    @user = users(:owner)
    sign_in(@user)
  end

  def test_bug_report_menu_item_visible
    # Check that the feedback menu items are visible
    click_selector ".user-menu-button"
    wait_for_selector ".user-menu-popover:not(.hidden)"

    assert_selector_visible "a:has-text('🐞 Report a Bug')"
    assert_selector_visible "a:has-text('✨ Request a Feature')"
  end

  def test_bug_report_form_opens
    # Open bug report form
    click_selector ".user-menu-button"
    wait_for_selector ".user-menu-popover:not(.hidden)"
    click_selector "a:has-text('🐞 Report a Bug')"

    # Wait for form to load
    wait_for_selector ".bug-report-form"
    assert_selector_visible "h2:has-text('Report a Bug')"
    assert_selector_visible "input[name='title']"
    assert_selector_visible "textarea[name='description']"
  end

  def test_feature_request_form_opens
    # Open feature request form
    click_selector ".user-menu-button"
    wait_for_selector ".user-menu-popover:not(.hidden)"
    click_selector "a:has-text('✨ Request a Feature')"

    # Wait for form to load
    wait_for_selector ".feature-request-form"
    assert_selector_visible "h2:has-text('Request a Feature')"
    assert_selector_visible ".progress-indicator"
    assert_selector_visible ".form-screen.active"
  end

  def test_feature_request_multi_step_navigation
    # Open feature request form
    click_selector ".user-menu-button"
    wait_for_selector ".user-menu-popover:not(.hidden)"
    click_selector "a:has-text('✨ Request a Feature')"

    wait_for_selector ".feature-request-form"

    # Screen 1
    assert_selector_visible "h3:has-text('Let\\'s start with the basics')"
    fill_selector "input[name='what_to_improve']", "Test feature request"
    click_selector "input[value='Nice to have']"

    # Go to screen 2
    click_selector "button:has-text('Next')"
    wait_for_text "Help us understand the problem"

    # Back button should now be visible
    assert_selector_visible "button:has-text('Back')"

    # Go back to screen 1
    click_selector "button:has-text('Back')"
    wait_for_text "Let's start with the basics"

    # Back button should be hidden on first screen
    assert_selector_not_visible "button:has-text('Back')"
  end

  def test_bug_report_form_closes
    # Open and close bug report form
    click_selector ".user-menu-button"
    wait_for_selector ".user-menu-popover:not(.hidden)"
    click_selector "a:has-text('🐞 Report a Bug')"

    wait_for_selector ".bug-report-form"

    # Close via X button
    click_selector ".modal-close"
    wait_for_selector_to_disappear ".bug-report-form"

    # Should be back at original page
    assert_current_path root_path
  end
end
