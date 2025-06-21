ENV["SKIP_FIXTURES"] = "true"
require_relative '../test_helper'
require_relative '../application_playwright_test_case'

class SubtaskFunctionalityTest < ApplicationPlaywrightTestCase
  setup do
    # Create test data
    @user = User.create!(
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      role: "admin"
    )
    
    @client = Client.create!(
      name: "Test Client",
      client_type: "residential"
    )
    
    @job = Job.create!(
      client: @client,
      title: "Test Job for Subtask Functionality",
      status: "open",
      priority: "normal",
      created_by: @user
    )
    
    # Create parent task
    @parent_task = Task.create!(
      job: @job,
      title: "Parent Task",
      position: 1,
      status: "new_task"
    )
    
    # Create a subtask
    @subtask1 = Task.create!(
      job: @job,
      parent: @parent_task,
      title: "Subtask 1",
      position: 1,
      status: "new_task"
    )
    
    # Create sub-subtask
    @sub_subtask = Task.create!(
      job: @job,
      parent: @subtask1,
      title: "Sub-subtask",
      position: 1,
      status: "new_task"
    )
    
    # Create standalone task
    @task2 = Task.create!(
      job: @job,
      title: "Task 2",
      position: 2,
      status: "new_task"
    )
    
    sign_in_as(@user)
  end

  test "subtasks are properly wrapped and can have their own subtasks" do
    # Navigate to job page
    visit "/clients/#{@client.id}/jobs/#{@job.id}"
    sleep 0.5 # Wait for page to load
    
    # Verify parent task exists
    parent_selector = ".task-item[data-task-id='#{@parent_task.id}']"
    assert @page.locator(parent_selector).count > 0, "Parent task should exist"
    
    # Verify subtask is wrapped in task-wrapper
    subtask_wrapper = @page.locator(".subtask-item[data-task-id='#{@subtask1.id}']").locator("xpath=ancestor::div[@class='task-wrapper']").first
    assert subtask_wrapper.count > 0, "Subtask should be wrapped in task-wrapper"
    
    # Verify subtask is inside parent's subtask container
    parent_wrapper = @page.locator(parent_selector).locator("xpath=ancestor::div[@class='task-wrapper']").first
    parent_subtasks = parent_wrapper.locator(".subtasks-container .subtask-item[data-task-id='#{@subtask1.id}']")
    assert parent_subtasks.count > 0, "Subtask should be in parent's container"
    
    # Verify sub-subtask exists and is properly nested
    sub_subtask_selector = ".subtask-item[data-task-id='#{@sub_subtask.id}']"
    assert @page.locator(sub_subtask_selector).count > 0, "Sub-subtask should exist"
    
    # Verify sub-subtask is inside subtask's container
    subtask1_wrapper = @page.locator(".subtask-item[data-task-id='#{@subtask1.id}']").locator("xpath=ancestor::div[@class='task-wrapper']").first
    subtask1_subtasks = subtask1_wrapper.locator(".subtasks-container .subtask-item[data-task-id='#{@sub_subtask.id}']")
    assert subtask1_subtasks.count > 0, "Sub-subtask should be in subtask's container"
    
    # Verify subtask count display - look for direct child only
    parent_content = parent_wrapper.locator("> .task-item > .task-content .subtask-count")
    assert parent_content.count > 0, "Parent should show subtask count"
    assert_match(/1 subtask/, parent_content.text_content, "Should show correct count")
    
    # Verify nested indentation
    parent_left = @page.evaluate(<<~JS)
      document.querySelector("#{parent_selector}").getBoundingClientRect().left
    JS
    subtask_left = @page.evaluate(<<~JS)
      document.querySelector(".subtask-item[data-task-id='#{@subtask1.id}']").getBoundingClientRect().left
    JS
    sub_subtask_left = @page.evaluate(<<~JS)
      document.querySelector("#{sub_subtask_selector}").getBoundingClientRect().left
    JS
    
    assert subtask_left > parent_left, "Subtask should be indented from parent"
    assert sub_subtask_left > subtask_left, "Sub-subtask should be indented from subtask"
  end

  test "tasks can be moved between levels via API" do
    # Navigate to job page
    visit "/clients/#{@client.id}/jobs/#{@job.id}"
    sleep 0.5 # Wait for page to load
    
    # Move Task 2 to be a child of Parent Task via API
    @task2.update!(parent_id: @parent_task.id)
    
    # Refresh to see changes
    refresh
    sleep 0.5
    
    # Verify Task 2 is now a subtask
    task2_as_subtask = @page.locator(".subtask-item[data-task-id='#{@task2.id}']")
    assert task2_as_subtask.count > 0, "Task 2 should be converted to subtask"
    
    # Verify it's in the parent's container
    parent_wrapper = @page.locator(".task-item[data-task-id='#{@parent_task.id}']").locator("xpath=ancestor::div[@class='task-wrapper']").first
    task2_in_parent = parent_wrapper.locator(".subtasks-container .subtask-item[data-task-id='#{@task2.id}']")
    assert task2_in_parent.count > 0, "Task 2 should be in parent's container"
    
    # Move subtask back to root level
    @subtask1.update!(parent_id: nil)
    
    refresh
    sleep 0.5
    
    # Verify Subtask 1 is now a root task
    subtask1_as_root = @page.locator(".tasks-list > .task-wrapper .task-item[data-task-id='#{@subtask1.id}']")
    assert subtask1_as_root.count > 0, "Subtask 1 should be at root level"
    
    # Verify it still has its sub-subtask
    subtask1_wrapper = @page.locator(".task-item[data-task-id='#{@subtask1.id}']").locator("xpath=ancestor::div[@class='task-wrapper']").first
    sub_subtask_still_there = subtask1_wrapper.locator(".subtasks-container .subtask-item[data-task-id='#{@sub_subtask.id}']")
    assert sub_subtask_still_there.count > 0, "Sub-subtask should still be attached"
  end
end