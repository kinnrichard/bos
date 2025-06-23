ENV["SKIP_FIXTURES"] = "true"
require_relative "../test_helper"
require_relative "../application_playwright_test_case"

class DropdownPositioningPlaywrightTest < ApplicationPlaywrightTestCase
  setup do
    # Create test data
    @user = User.create!(
      name: "Test User",
      email: "test@example.com",
      password: "secret123",
      role: "admin"
    )

    @technician = User.create!(
      name: "Test Technician",
      email: "tech@example.com",
      password: "secret123",
      role: "technician"
    )

    @client = Client.create!(
      name: "Test Client",
      client_type: "residential"
    )

    @job = Job.create!(
      client: @client,
      title: "Test Job for Dropdown Positioning",
      status: "open",
      priority: "normal",
      created_by: @user
    )

    # Sign in user
    visit "/login"
    fill_in "Email", with: @user.email
    fill_in "Password", with: "secret123"
    click_on "Sign In"
    sleep 0.5

    # Navigate to job page
    visit "/clients/#{@client.id}/jobs/#{@job.id}"
    sleep 0.5 # Wait for page to load
  end

  test "dropdown menus in job status popover are properly aligned" do
    # Open the job status popover
    @page.click('button[data-action="click->header-job#toggleJobPopover"]')
    sleep 0.3 # Wait for popover animation

    # Click the assignee dropdown
    @page.click("text=Unassigned")
    sleep 0.2 # Wait for dropdown to open

    # Get button and menu positions
    alignment_info = @page.evaluate(<<~JS)
      (() => {
        const button = Array.from(document.querySelectorAll('button')).find(btn =>#{' '}
          btn.textContent.includes('Unassigned'));
        const menu = document.querySelector('.dropdown-menu:not(.hidden)');
      #{'  '}
        if (button && menu) {
          const buttonRect = button.getBoundingClientRect();
          const menuRect = menu.getBoundingClientRect();
      #{'    '}
          return {
            button: {
              left: buttonRect.left,
              right: buttonRect.right,
              width: buttonRect.width
            },
            menu: {
              left: menuRect.left,
              right: menuRect.right,
              width: menuRect.width
            },
            leftDiff: Math.abs(menuRect.left - buttonRect.left)
          };
        }
        return null;
      })()
    JS

    assert_not_nil alignment_info, "Could not find button and menu elements"
    assert_equal 0, alignment_info["leftDiff"].to_i, "Dropdown menu left edge should align with button left edge"

    # Verify menu width matches button width
    assert_equal alignment_info["button"]["width"], alignment_info["menu"]["width"],
                 "Dropdown menu width should match button width"
  end

  test "dropdown menus in schedule popover are properly aligned" do
    # Open the schedule popover
    @page.click('button[data-action="click->header-job#toggleSchedulePopover"]')
    sleep 0.3 # Wait for popover animation

    # Click the technician dropdown
    @page.click("text=Select technicians...")
    sleep 0.2 # Wait for dropdown to open

    # Get button and menu positions
    alignment_info = @page.evaluate(<<~JS)
      (() => {
        const button = Array.from(document.querySelectorAll('button')).find(btn =>#{' '}
          btn.textContent.includes('Select technicians'));
        const menu = document.querySelector('.dropdown-menu:not(.hidden)');
      #{'  '}
        if (button && menu) {
          const buttonRect = button.getBoundingClientRect();
          const menuRect = menu.getBoundingClientRect();
      #{'    '}
          return {
            button: {
              left: buttonRect.left,
              right: buttonRect.right,
              width: buttonRect.width,
              bottom: buttonRect.bottom
            },
            menu: {
              left: menuRect.left,
              right: menuRect.right,
              width: menuRect.width,
              top: menuRect.top
            },
            leftDiff: Math.abs(menuRect.left - buttonRect.left),
            verticalGap: menuRect.top - buttonRect.bottom
          };
        }
        return null;
      })()
    JS

    assert_not_nil alignment_info, "Could not find button and menu elements"
    assert_equal 0, alignment_info["leftDiff"].to_i, "Dropdown menu left edge should align with button left edge"

    # Verify menu appears below button with small gap
    assert_operator alignment_info["verticalGap"], :>=, 0, "Menu should appear below button"
    assert_operator alignment_info["verticalGap"], :<, 10, "Menu should be close to button (within 10px)"
  end

  test "dropdown positioning uses fixed positioning in popovers" do
    # Open the job status popover
    @page.click('button[data-action="click->header-job#toggleJobPopover"]')
    sleep 0.3 # Wait for popover animation

    # Click the status dropdown
    # Find and click the New status button inside the popover
    @page.click('.popover .dropdown-button:has-text("New")')
    sleep 0.2 # Wait for dropdown to open

    # Check positioning style
    positioning_info = @page.evaluate(<<~JS)
      (() => {
        const menu = document.querySelector('.dropdown-menu:not(.hidden)');
        if (menu) {
          const computedStyle = getComputedStyle(menu);
          const inlineStyle = menu.style;
          return {
            computedPosition: computedStyle.position,
            inlinePosition: inlineStyle.position,
            hasFixedPositioning: inlineStyle.position === 'fixed',
            left: inlineStyle.left,
            top: inlineStyle.top || inlineStyle.bottom
          };
        }
        return null;
      })()
    JS

    assert_not_nil positioning_info, "Could not find dropdown menu"
    assert positioning_info["hasFixedPositioning"], "Dropdown should use fixed positioning in popovers"
    assert_not_empty positioning_info["left"], "Left position should be set"
    assert_not_empty positioning_info["top"], "Top or bottom position should be set"
  end

  test "multiple dropdowns in same popover maintain alignment" do
    # Open the schedule popover
    @page.click('button[data-action="click->header-job#toggleSchedulePopover"]')
    sleep 0.3 # Wait for popover animation

    # Test Type dropdown
    @page.click("text=Due Date")
    sleep 0.2

    type_alignment = @page.evaluate(<<~JS)
      (() => {
        const buttons = Array.from(document.querySelectorAll('.dropdown-button'));
        const button = buttons.find(btn => btn.textContent.includes('Due Date'));
        const menu = document.querySelector('.dropdown-menu:not(.hidden)');
      #{'  '}
        if (button && menu) {
          const buttonRect = button.getBoundingClientRect();
          const menuRect = menu.getBoundingClientRect();
          return Math.abs(menuRect.left - buttonRect.left);
        }
        return null;
      })()
    JS

    assert_equal 0, type_alignment.to_i, "Type dropdown should be aligned"

    # Close the dropdown
    @page.keyboard.press("Escape")
    sleep 0.1

    # Test Technician dropdown
    @page.click("text=Select technicians...")
    sleep 0.2

    tech_alignment = @page.evaluate(<<~JS)
      (() => {
        const buttons = Array.from(document.querySelectorAll('.dropdown-button'));
        const button = buttons.find(btn => btn.textContent.includes('Select technicians'));
        const menu = document.querySelector('.dropdown-menu:not(.hidden)');
      #{'  '}
        if (button && menu) {
          const buttonRect = button.getBoundingClientRect();
          const menuRect = menu.getBoundingClientRect();
          return Math.abs(menuRect.left - buttonRect.left);
        }
        return null;
      })()
    JS

    assert_equal 0, tech_alignment.to_i, "Technician dropdown should be aligned"
  end

  test "dropdown maintains alignment after scrolling" do
    # Add some tasks to make the page scrollable
    10.times do |i|
      Task.create!(
        job: @job,
        title: "Task #{i + 1}",
        position: i + 1,
        status: "new_task"
      )
    end

    # Refresh the page
    @page.reload
    sleep 0.5

    # Scroll down a bit
    @page.evaluate("window.scrollBy(0, 200)")
    sleep 0.2

    # Open the job status popover
    @page.click('button[data-action="click->header-job#toggleJobPopover"]')
    sleep 0.3

    # Click the priority dropdown
    @page.click("text=Normal")
    sleep 0.2

    # Check alignment after scroll
    alignment_info = @page.evaluate(<<~JS)
      (() => {
        const buttons = Array.from(document.querySelectorAll('.dropdown-button'));
        const button = buttons.find(btn => btn.textContent.includes('Normal'));
        const menu = document.querySelector('.dropdown-menu:not(.hidden)');
      #{'  '}
        if (button && menu) {
          const buttonRect = button.getBoundingClientRect();
          const menuRect = menu.getBoundingClientRect();
      #{'    '}
          return {
            leftDiff: Math.abs(menuRect.left - buttonRect.left),
            isFixed: menu.style.position === 'fixed'
          };
        }
        return null;
      })()
    JS

    assert_not_nil alignment_info, "Could not find dropdown elements"
    assert alignment_info["isFixed"], "Dropdown should use fixed positioning"
    assert_equal 0, alignment_info["leftDiff"].to_i, "Dropdown should remain aligned after scrolling"
  end
end
