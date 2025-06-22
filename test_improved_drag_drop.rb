require 'playwright'

# Test drag and drop functionality after improvements

Playwright.create(playwright_cli_executable_path: "#{ENV['HOME']}/.local/share/mise/installs/ruby/3.4.4/lib/ruby/gems/3.4.0/gems/playwright-ruby-client-1.52.0/exe/playwright", headless: false) do |playwright|
  browser = playwright.chromium.launch
  page = browser.new_page

  # Navigate to login
  page.goto('http://localhost:3000')

  # Login
  page.fill('input[type="email"]', 'test@example.com')
  page.fill('input[type="password"]', 'secret123')
  page.click('button[type="submit"]')

  # Wait for navigation
  page.wait_for_url('**/jobs/**')

  puts "Creating test data..."

  # Create test data using rails runner
  job_info = `rails runner "
    # Find test user
    user = User.find_by(email: 'test@example.com')

    # Create a fresh client and job
    client = Client.create!(name: 'Drag Drop Test Client', client_type: 'residential')
    job = Job.create!(
      client: client,
      title: 'Test Subtask Ordering',
      status: 'open',
      priority: 'normal',
      created_by: user
    )

    # Create parent task
    parent = Task.create!(
      job: job,
      title: 'Parent Task',
      status: 'new_task',
      position: 1
    )

    # Create 3 subtasks
    subtask1 = Task.create!(
      job: job,
      parent: parent,
      title: 'Subtask 1',
      status: 'new_task',
      position: 1
    )

    subtask2 = Task.create!(
      job: job,
      parent: parent,
      title: 'Subtask 2',
      status: 'new_task',
      position: 2
    )

    subtask3 = Task.create!(
      job: job,
      parent: parent,
      title: 'Subtask 3',
      status: 'new_task',
      position: 3
    )

    # Create a standalone task that will be dragged
    standalone = Task.create!(
      job: job,
      title: 'Standalone Task',
      status: 'new_task',
      position: 2
    )

    puts job.id
    puts client.id
  "`

  job_id, client_id = job_info.strip.split("\n").map(&:to_i)

  puts "Created job #{job_id} for client #{client_id}"

  # Navigate to the job
  page.goto("http://localhost:3000/clients/#{client_id}/jobs/#{job_id}")

  # Wait for page to load
  page.wait_for_selector('.task-item')

  puts "Initial state:"
  page.screenshot(path: 'drag_drop_initial.png')

  # Test 1: Drag standalone task to become a subtask in the middle of existing subtasks
  puts "\n=== Test 1: Drag standalone task to middle of subtasks ==="

  standalone = page.locator('.task-item', has_text: 'Standalone Task').first
  subtask2 = page.locator('.subtask-item', has_text: 'Subtask 2').first

  # Drag standalone task to the middle of subtask2 (should become a subtask)
  standalone.drag_to(subtask2)

  # Wait for DOM update
  sleep 1

  # Verify standalone became a subtask
  if page.locator('.subtask-item', has_text: 'Standalone Task').count > 0
    puts "✓ Standalone task became a subtask"
  else
    puts "✗ Standalone task did not become a subtask"
  end

  page.screenshot(path: 'drag_drop_after_test1.png')

  # Test 2: Reorder subtasks - drag Subtask 3 before Subtask 1
  puts "\n=== Test 2: Reorder subtasks ==="

  subtask3 = page.locator('.subtask-item', has_text: 'Subtask 3').first
  subtask1 = page.locator('.subtask-item', has_text: 'Subtask 1').first

  # Get bounding boxes to drag to top edge
  box1 = subtask1.bounding_box
  box3 = subtask3.bounding_box

  # Drag from center of subtask3 to top of subtask1
  page.mouse.move(box3['x'] + box3['width'] / 2, box3['y'] + box3['height'] / 2)
  page.mouse.down
  page.mouse.move(box1['x'] + box1['width'] / 2, box1['y'] + 2)  # Near top edge
  page.mouse.up

  sleep 1

  page.screenshot(path: 'drag_drop_after_test2.png')

  # Verify order by checking DOM order
  subtasks = page.locator('.subtask-item').all
  subtask_titles = subtasks.map { |s| s.text_content.strip }

  puts "Subtask order after reordering: #{subtask_titles.join(', ')}"

  if subtask_titles[0] == 'Subtask 3'
    puts "✓ Subtask 3 is now first"
  else
    puts "✗ Subtask 3 is not first (found: #{subtask_titles[0]})"
  end

  # Test 3: Drag subtask to root level
  puts "\n=== Test 3: Drag subtask to root level ==="

  subtask2 = page.locator('.subtask-item', has_text: 'Subtask 2').first
  parent_task = page.locator('.task-item', has_text: 'Parent Task').first

  # Get parent task bounding box
  parent_box = parent_task.bounding_box

  # Drag subtask2 to below parent task (should become root task)
  page.mouse.move(subtask2.bounding_box['x'] + 50, subtask2.bounding_box['y'] + 10)
  page.mouse.down
  page.mouse.move(parent_box['x'] + 50, parent_box['y'] + parent_box['height'] + 10)
  page.mouse.up

  sleep 1

  page.screenshot(path: 'drag_drop_after_test3.png')

  # Verify subtask2 became a root task
  if page.locator('.task-item', has_text: 'Subtask 2').count > 0
    puts "✓ Subtask 2 became a root task"
  else
    puts "✗ Subtask 2 did not become a root task"
  end

  # Final verification - reload page to verify server state
  puts "\n=== Reloading page to verify persistence ==="
  page.reload
  page.wait_for_selector('.task-item')

  page.screenshot(path: 'drag_drop_after_reload.png')

  # Check final state
  root_tasks = page.locator('.task-item').all.map { |t| t.text_content.strip }
  subtasks = page.locator('.subtask-item').all.map { |s| s.text_content.strip }

  puts "\nFinal state:"
  puts "Root tasks: #{root_tasks.join(', ')}"
  puts "Subtasks: #{subtasks.join(', ')}"

  browser.close
end

puts "\nTest complete! Check the screenshots:"
puts "- drag_drop_initial.png"
puts "- drag_drop_after_test1.png"
puts "- drag_drop_after_test2.png"
puts "- drag_drop_after_test3.png"
puts "- drag_drop_after_reload.png"
