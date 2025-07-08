require "test_helper"
require "playwright"

# Helper for Playwright-based tests
module PlaywrightHelper
  extend ActiveSupport::Concern

  included do
    attr_accessor :playwright, :browser, :context, :page

    # Set up Playwright before running tests
    setup do
      setup_playwright
    end

    # Clean up after tests
    teardown do
      teardown_playwright
    end
  end

  private

  def setup_playwright
    # Start Playwright in a non-block mode
    @playwright_execution = Playwright.create(playwright_cli_executable_path: "./node_modules/.bin/playwright")
    @playwright = @playwright_execution.playwright

    @browser = @playwright.chromium.launch(
      headless: true,
      timeout: 30000
    )

    @context = @browser.new_context(
      viewport: { width: 1400, height: 900 },
      ignoreHTTPSErrors: true
    )

    @page = @context.new_page

    # Set up console message logging in development
    unless ENV["CI"]
      @page.on("console", ->(msg) { puts "[Browser Console] #{msg.text}" })
      @page.on("pageerror", ->(error) { puts "[Page Error] #{error.message}" })
    end
  end

  def teardown_playwright
    @page&.close
    @context&.close
    @browser&.close
    @playwright_execution&.stop
  end

  # Helper to get the Rails test server URL
  def root_url
    "http://#{host}:#{port}"
  end

  # Get the host for the test server (can be overridden by test case)
  def host
    "localhost"
  end

  # Get the port for the test server (can be overridden by test case)
  def port
    3000
  end

  # Navigate to a path relative to the root
  def visit(path)
    url = path.start_with?("http") ? path : "#{root_url}#{path}"
    @page.goto(url, timeout: 30000)
  end

  # Common assertions
  def assert_text(text, selector: nil)
    if selector
      element = @page.locator(selector)
      assert element.text_content.include?(text), "Expected to find '#{text}' in #{selector}"
    else
      assert @page.text_content("body").include?(text), "Expected to find '#{text}' on page"
    end
  end

  def assert_no_text(text, selector: nil)
    if selector
      element = @page.locator(selector)
      assert !element.text_content.include?(text), "Expected not to find '#{text}' in #{selector}"
    else
      assert !@page.text_content("body").include?(text), "Expected not to find '#{text}' on page"
    end
  end

  # Fill in a form field
  def fill_in(label_or_selector, with:)
    if label_or_selector.start_with?("#", ".", "[")
      @page.fill(label_or_selector, with)
    else
      @page.get_by_label(label_or_selector).fill(with)
    end
  end

  # Click a button or link
  def click_on(text_or_selector)
    if text_or_selector.start_with?("#", ".", "[")
      @page.click(text_or_selector)
    else
      # Try button first, then link
      begin
        @page.get_by_role("button", name: text_or_selector).click
      rescue
        @page.get_by_role("link", name: text_or_selector).click
      end
    end
  end

  # Take a screenshot
  def take_screenshot(name = nil)
    name ||= "screenshot_#{Time.now.to_i}"
    path = Rails.root.join("tmp", "screenshots", "#{name}.png")
    FileUtils.mkdir_p(File.dirname(path))
    @page.screenshot(path: path.to_s)
    puts "Screenshot saved to: #{path}"
  end

  # Helper to wait for an element
  def wait_for_selector(selector, timeout: 5000)
    @page.wait_for_selector(selector, timeout: timeout / 1000.0)  # Convert to seconds
  end

  # Helper to wait for navigation
  def wait_for_navigation
    @page.wait_for_load_state
  end
end
