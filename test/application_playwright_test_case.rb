require "playwright_helper"
require "capybara/rails"

class ApplicationPlaywrightTestCase < ActiveSupport::TestCase
  include PlaywrightHelper

  # Use transactional fixtures for database cleanup
  self.use_transactional_tests = true

  # Don't load all fixtures by default for Playwright tests
  # Tests can explicitly load fixtures if needed

  # Class-level server management
  class << self
    attr_accessor :test_server_app

    def start_test_server
      return if @test_server_app

      # Use Capybara to manage the test server
      require "capybara/rails"

      # Configure Capybara
      Capybara.server = :puma, { Silent: true }

      # Start the server
      @test_server_app = Capybara::Server.new(Rails.application).boot

      puts "Test server started at http://#{@test_server_app.host}:#{@test_server_app.port}"
    end
  end

  # Start server once for all tests
  setup do
    self.class.start_test_server
  end

  teardown do
    # Playwright cleanup is handled by PlaywrightHelper
  end

  private

  # Override to use the class-level server info
  def host
    self.class.test_server_app&.host || "127.0.0.1"
  end

  def port
    self.class.test_server_app&.port || 9887
  end

  # Helper to sign in a user
  def sign_in_as(user)
    visit "/login"
    fill_in "Email", with: user.email
    fill_in "Password", with: "password123" # Assuming test users have this password
    click_on "Sign In"
    wait_for_navigation
  end

  # Helper to wait for an element
  def wait_for_selector(selector, timeout: 5000)
    @page.wait_for_selector(selector, timeout: timeout / 1000.0)  # Convert to seconds
  end

  # Helper to wait for navigation
  def wait_for_navigation
    @page.wait_for_load_state
  end

  # Helper for JavaScript execution
  def execute_script(script)
    @page.evaluate(script)
  end

  # Helper to get current URL
  def current_url
    @page.url
  end

  # Helper to refresh the page
  def refresh
    @page.reload
  end

  # Debug helper to pause execution
  def debug_pause
    puts "Test paused. Press Enter to continue..."
    gets if ENV["DEBUG"]
  end

  # Helper for selecting from a dropdown
  def select(value, from:)
    @page.select_option("select[name='#{from}'], select[id='#{from}'], label:has-text('#{from}') + select", value)
  end

  # Helper for checking a checkbox
  def check(label_or_selector)
    if label_or_selector.start_with?("#", ".", "[")
      @page.check(label_or_selector)
    else
      @page.get_by_label(label_or_selector).check
    end
  end

  # Helper for unchecking a checkbox
  def uncheck(label_or_selector)
    if label_or_selector.start_with?("#", ".", "[")
      @page.uncheck(label_or_selector)
    else
      @page.get_by_label(label_or_selector).uncheck
    end
  end

  # Helper to assert current path
  def assert_current_path(expected_path)
    current = URI.parse(current_url).path
    assert_equal expected_path, current, "Expected to be on #{expected_path} but was on #{current}"
  end

  # Helper to interact with Stimulus controllers
  def find_stimulus_controller(identifier)
    @page.locator("[data-controller~='#{identifier}']").first
  end

  # Wait for Stimulus controller to be connected
  def wait_for_stimulus(controller_name)
    @page.wait_for_function(
      "(controllerName) => {
        const element = document.querySelector(`[data-controller~='${controllerName}']`);
        return element && element._stimulus && element._stimulus.controllers.length > 0;
      }",
      controller_name
    )
  end
end
