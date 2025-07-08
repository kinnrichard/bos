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

  test "dropdown toggle behavior - clicking button again closes dropdown" do
    # Open the schedule popover
    @page.click('button[data-action="click->header-job#toggleSchedulePopover"]')
    sleep 0.3 # Wait for popover animation

    # Click the Type dropdown to open it
    @page.click("text=Due Date")
    sleep 0.2 # Wait for dropdown to open

    # Verify dropdown is open
    open_state = @page.evaluate(<<~JS)
      (() => {
        const menu = document.querySelector('.dropdown-menu:not(.hidden)');
        return !!menu;
      })()
    JS

    assert open_state, "Dropdown should be open after first click"

    # Click the button again to close it
    @page.click("text=Due Date")
    sleep 0.2 # Wait for dropdown to close

    # Verify dropdown is closed
    closed_state = @page.evaluate(<<~JS)
      (() => {
        const menu = document.querySelector('.dropdown-menu:not(.hidden)');
        return !!menu;
      })()
    JS

    assert_not closed_state, "Dropdown should be closed after second click"

    # Test with technician dropdown too
    @page.click("text=Select technicians...")
    sleep 0.2

    tech_open = @page.evaluate(<<~JS)
      (() => {
        const menus = document.querySelectorAll('.dropdown-menu:not(.hidden)');
        return menus.length;
      })()
    JS

    assert_equal 1, tech_open, "Technician dropdown should be open"

    # Click again to close
    @page.click("text=Select technicians...")
    sleep 0.2

    tech_closed = @page.evaluate(<<~JS)
      (() => {
        const menus = document.querySelectorAll('.dropdown-menu:not(.hidden)');
        return menus.length;
      })()
    JS

    assert_equal 0, tech_closed, "All dropdowns should be closed"
  end

  test "dropdown toggle works in job status popover" do
    # Open the job status popover
    @page.click('button[data-action="click->header-job#toggleJobPopover"]')
    sleep 0.3 # Wait for popover animation

    # Test Status dropdown toggle
    status_button = @page.locator('.job-popover button:has-text("New")').first

    # Click to open
    status_button.click
    sleep 0.2

    status_open = @page.evaluate(<<~JS)
      (() => {
        return !!document.querySelector('.dropdown-menu:not(.hidden)');
      })()
    JS

    assert status_open, "Status dropdown should be open after first click"

    # Click again to close
    status_button.click
    sleep 0.2

    status_closed = @page.evaluate(<<~JS)
      (() => {
        return !document.querySelector('.dropdown-menu:not(.hidden)');
      })()
    JS

    assert status_closed, "Status dropdown should be closed after second click"

    # Test Assigned To dropdown toggle
    assigned_button = @page.locator('.job-popover button:has-text("Unassigned")').first

    # Click to open
    assigned_button.click
    sleep 0.2

    assigned_open = @page.evaluate(<<~JS)
      (() => {
        return !!document.querySelector('.dropdown-menu:not(.hidden)');
      })()
    JS

    assert assigned_open, "Assigned To dropdown should be open"

    # Click again to close
    assigned_button.click
    sleep 0.2

    assigned_closed = @page.evaluate(<<~JS)
      (() => {
        return !document.querySelector('.dropdown-menu:not(.hidden)');
      })()
    JS

    assert assigned_closed, "Assigned To dropdown should be closed"
  end

  test "dropdown appears above button when near viewport bottom" do
    # Create many tasks to make the page scrollable
    15.times do |i|
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

    # Scroll to bottom of page
    @page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    sleep 0.3

    # Open the job status popover
    @page.click('button[data-action="click->header-job#toggleJobPopover"]')
    sleep 0.3

    # Find a dropdown button near the bottom of the popover
    # Priority dropdown is usually at the bottom
    priority_button = @page.locator(".job-popover .dropdown-button").nth(2)

    # Get button position before opening
    button_info = @page.evaluate(<<~JS)
      (() => {
        const buttons = document.querySelectorAll('.job-popover .dropdown-button');
        const button = buttons[2]; // Priority button
        if (button) {
          const rect = button.getBoundingClientRect();
          return {
            top: rect.top,
            bottom: rect.bottom,
            viewportHeight: window.innerHeight,
            spaceBelow: window.innerHeight - rect.bottom
          };
        }
        return null;
      })()
    JS

    assert_not_nil button_info, "Could not find priority button"

    # Click the priority dropdown
    priority_button.click
    sleep 0.2

    # Check if dropdown appears above when space below is limited
    dropdown_info = @page.evaluate(<<~JS)
      (() => {
        const menu = document.querySelector('.dropdown-menu:not(.hidden)');
        const button = document.querySelectorAll('.job-popover .dropdown-button')[2];
        if (menu && button) {
          const menuRect = menu.getBoundingClientRect();
          const buttonRect = button.getBoundingClientRect();
          const hasDropUpClass = menu.classList.contains('dropdown-up');
          const hasTransform = menu.style.transform.includes('translateY');
      #{'    '}
          return {
            menuTop: menuRect.top,
            menuBottom: menuRect.bottom,
            buttonTop: buttonRect.top,
            buttonBottom: buttonRect.bottom,
            menuAppearsAbove: menuRect.bottom < buttonRect.top,
            hasDropUpClass: hasDropUpClass,
            hasTransform: hasTransform,
            transform: menu.style.transform,
            spaceBelow: window.innerHeight - buttonRect.bottom,
            menuHeight: menuRect.height
          };
        }
        return null;
      })()
    JS

    assert_not_nil dropdown_info, "Could not find dropdown menu"

    # If there's not enough space below, menu should appear above
    if dropdown_info["spaceBelow"] < dropdown_info["menuHeight"] + 10
      assert dropdown_info["menuAppearsAbove"], "Dropdown should appear above button when not enough space below"
      assert dropdown_info["hasDropUpClass"], "Dropdown should have 'dropdown-up' class"
      assert dropdown_info["hasTransform"], "Dropdown should use transform for positioning"
    end
  end

  test "dropdown positioning adjusts correctly with CSS transform" do
    # Scroll page to create a scenario where dropdown needs to appear above
    @page.evaluate("document.body.style.height = '2000px'") # Make page tall
    sleep 0.1

    # Open the job status popover
    @page.click('button[data-action="click->header-job#toggleJobPopover"]')
    sleep 0.3

    # Position popover near bottom
    @page.evaluate(<<~JS)
      (() => {
        const popover = document.querySelector('.job-popover');
        if (popover) {
          // Position popover near bottom of viewport
          popover.style.top = `${window.innerHeight - 300}px`;
        }
      })()
    JS
    sleep 0.1

    # Click the status dropdown
    @page.click(".job-popover .dropdown-button")
    sleep 0.2

    # Verify transform-based positioning
    transform_info = @page.evaluate(<<~JS)
      (() => {
        const menu = document.querySelector('.dropdown-menu:not(.hidden)');
        if (menu) {
          const computedStyle = getComputedStyle(menu);
          const transform = menu.style.transform;
          const hasNegativeTranslateY = transform.includes('translateY(-');
      #{'    '}
          return {
            transform: transform,
            hasNegativeTranslateY: hasNegativeTranslateY,
            position: menu.style.position,
            top: menu.style.top
          };
        }
        return null;
      })()
    JS

    assert_not_nil transform_info, "Could not find dropdown menu"

    # When dropdown needs to appear above, it should use negative translateY
    if transform_info["hasNegativeTranslateY"]
      assert_match /translateY\(-\d+px\)/, transform_info["transform"], "Should use negative translateY for upward positioning"
      assert_equal "fixed", transform_info["position"], "Should use fixed positioning"
    end
  end

  test "dropdown stays within viewport bounds in all scenarios" do
    # Test multiple viewport positions
    viewport_positions = [
      { scroll: 0, popover_top: 100 },    # Top of page
      { scroll: 500, popover_top: 300 },  # Middle of page
      { scroll: "bottom", popover_top: -400 } # Near bottom (negative means from bottom)
    ]

    viewport_positions.each_with_index do |position, index|
      # Reset page state
      @page.reload
      sleep 0.5

      # Set up scroll position
      if position[:scroll] == "bottom"
        @page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
      else
        @page.evaluate("window.scrollTo(0, #{position[:scroll]})")
      end
      sleep 0.2

      # Open popover
      @page.click('button[data-action="click->header-job#toggleJobPopover"]')
      sleep 0.3

      # Position popover if needed
      if position[:popover_top] < 0
        @page.evaluate(<<~JS)
          (() => {
            const popover = document.querySelector('.job-popover');
            if (popover) {
              popover.style.top = `${window.innerHeight + #{position[:popover_top]}}px`;
            }
          })()
        JS
      end

      # Test each dropdown in the popover
      [ "status", "assignee", "priority" ].each_with_index do |dropdown_type, dropdown_index|
        # Click the dropdown
        @page.locator(".job-popover .dropdown-button").nth(dropdown_index).click
        sleep 0.2

        # Check if dropdown is within viewport
        viewport_check = @page.evaluate(<<~JS)
          (() => {
            const menu = document.querySelector('.dropdown-menu:not(.hidden)');
            if (menu) {
              const rect = menu.getBoundingClientRect();
              return {
                inViewportTop: rect.top >= 0,
                inViewportBottom: rect.bottom <= window.innerHeight,
                inViewportLeft: rect.left >= 0,
                inViewportRight: rect.right <= window.innerWidth,
                menuTop: rect.top,
                menuBottom: rect.bottom,
                viewportHeight: window.innerHeight
              };
            }
            return null;
          })()
        JS

        assert_not_nil viewport_check, "Could not find dropdown menu for #{dropdown_type} at position #{index}"
        assert viewport_check["inViewportTop"], "#{dropdown_type} dropdown top should be within viewport at position #{index}"
        assert viewport_check["inViewportBottom"], "#{dropdown_type} dropdown bottom should be within viewport at position #{index}"
        assert viewport_check["inViewportLeft"], "#{dropdown_type} dropdown left should be within viewport at position #{index}"
        assert viewport_check["inViewportRight"], "#{dropdown_type} dropdown right should be within viewport at position #{index}"

        # Close dropdown
        @page.keyboard.press("Escape")
        sleep 0.1
      end

      # Close popover
      @page.keyboard.press("Escape")
      sleep 0.2
    end
  end
end
