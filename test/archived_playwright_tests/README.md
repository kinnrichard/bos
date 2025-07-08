# Playwright Ruby Tests

This directory contains Playwright-based system tests for the Rails application, using the `playwright-ruby-client` gem.

## Setup

1. Ensure Playwright browsers are installed:
   ```bash
   npx playwright install chromium
   ```

2. The `playwright-ruby-client` gem is already in the Gemfile.

## Running Tests

### Run all Playwright tests:
```bash
rails test:playwright
```

### Run a specific test file:
```bash
rails test:playwright_file[sessions_playwright_test]
# or with full path
rails test:playwright_file[test/playwright/sessions_playwright_test.rb]
```

### Run tests with visible browser (debugging):
```bash
rails test:playwright_debug
```

### Run tests and capture screenshots:
```bash
rails test:playwright_screenshots
```
Screenshots will be saved to `tmp/screenshots/`

## Writing Tests

1. Create test files in `test/playwright/` with names ending in `_playwright_test.rb`

2. Inherit from `ApplicationPlaywrightTestCase`:
   ```ruby
   class YourPlaywrightTest < ApplicationPlaywrightTestCase
     test "your test name" do
       visit "/some-path"
       fill_in "Field Label", with: "value"
       click_on "Submit"
       assert_text "Success message"
     end
   end
   ```

3. Available helper methods:
   - `visit(path)` - Navigate to a page
   - `fill_in(label, with: value)` - Fill in a form field
   - `click_on(text)` - Click a button or link
   - `assert_text(text)` - Assert text is present
   - `assert_no_text(text)` - Assert text is not present
   - `assert_current_path(path)` - Assert current URL path
   - `take_screenshot(name)` - Capture a screenshot
   - `wait_for_selector(selector)` - Wait for element
   - `wait_for_navigation` - Wait for page load
   - `sign_in_as(user)` - Helper to sign in

## Advantages over Selenium

1. **Faster execution** - Playwright is generally faster than Selenium
2. **Better reliability** - Auto-waiting for elements, better handling of dynamic content
3. **Modern API** - Built for modern web apps with better JavaScript handling
4. **Multiple browser contexts** - Test multiple users/sessions in parallel
5. **Better debugging** - Screenshots, videos, and trace viewer

## Debugging Tips

1. Use `rails test:playwright_debug` to see the browser
2. Add `debug_pause` in your test to pause execution
3. Use `take_screenshot("name")` to capture screenshots at key points
4. Check browser console output (logged automatically in non-CI environments)

## CI Configuration

For CI environments, the tests automatically run in headless mode with appropriate flags for containerized environments.

## Coexistence with Selenium Tests

Playwright tests coexist with the existing Selenium-based system tests. You can gradually migrate tests or use both frameworks as needed.