ENV["SKIP_FIXTURES"] = "true"
require_relative '../test_helper'
require_relative '../application_playwright_test_case'

class TaskRenamePlaywrightTest < ApplicationPlaywrightTestCase
  setup do
    # Create test data
    @user = User.create!(
      name: "Test User",
      email: "test@example.com",
      password: "secret123",
      role: "admin"
    )
    
    @client = Client.create!(
      name: "Test Client",
      client_type: "residential"
    )
    
    @job = Job.create!(
      client: @client,
      title: "Test Job for Rename",
      status: "open",
      priority: "normal",
      created_by: @user
    )
    
    # Create some tasks
    @task1 = Task.create!(
      job: @job,
      title: "Original Task Title",
      position: 1,
      status: "new_task"
    )
    
    @task2 = Task.create!(
      job: @job,
      title: "Second Task",
      position: 2,
      status: "new_task"
    )
    
    # Create a task with subtasks
    @parent_task = Task.create!(
      job: @job,
      title: "Parent Task",
      position: 3,
      status: "new_task"
    )
    
    @subtask = Task.create!(
      job: @job,
      parent: @parent_task,
      title: "Original Subtask Title",
      position: 1,
      status: "new_task"
    )
    
    sign_in_as(@user)
  end

  test "rename task by pressing Enter key" do
    # Navigate to job page
    visit "/clients/#{@client.id}/jobs/#{@job.id}"
    sleep 0.5 # Wait for page to load
    
    # Ensure CSRF token is present
    ensure_csrf_token
    
    # Click on the first task title to edit
    task_title = @page.locator('.task-item[data-task-id="' + @task1.id.to_s + '"] .task-title').first
    task_title.click
    
    # Clear and type new title
    task_title.fill("Renamed via Enter Key")
    
    # Press Enter to save
    task_title.press("Enter")
    
    # Wait for save
    sleep 0.5
    
    # Verify the title was saved
    assert_equal "Renamed via Enter Key", task_title.text_content
    
    # Verify task is no longer in edit mode (contenteditable but not focused)
    assert task_title.evaluate("el => el.contentEditable === 'true' && document.activeElement !== el")
    
    # Refresh page to verify persistence
    @page.reload
    sleep 0.5
    
    updated_task_title = @page.locator('.task-item[data-task-id="' + @task1.id.to_s + '"] .task-title').first
    assert_equal "Renamed via Enter Key", updated_task_title.text_content
  end

  test "cancel task rename by pressing Escape key" do
    visit "/clients/#{@client.id}/jobs/#{@job.id}"
    sleep 0.5
    ensure_csrf_token
    
    # Click on task title to edit
    task_title = @page.locator('.task-item[data-task-id="' + @task2.id.to_s + '"] .task-title').first
    original_title = task_title.text_content
    task_title.click
    
    # Type new title but don't save
    task_title.fill("This change will be cancelled")
    
    # Press Escape to cancel
    task_title.press("Escape")
    
    # Wait a moment
    sleep 0.2
    
    # Verify the original title is restored
    assert_equal original_title, task_title.text_content
    
    # Verify task is no longer in edit mode
    assert task_title.evaluate("el => document.activeElement !== el")
  end

  test "rename subtask by pressing Enter key" do
    visit "/clients/#{@client.id}/jobs/#{@job.id}"
    sleep 0.5
    ensure_csrf_token
    
    # Click on the subtask title to edit
    subtask_title = @page.locator('.subtask-item[data-task-id="' + @subtask.id.to_s + '"] .subtask-title').first
    subtask_title.click
    
    # Clear and type new title
    subtask_title.fill("Renamed Subtask via Enter")
    
    # Press Enter to save
    subtask_title.press("Enter")
    
    # Wait for save
    sleep 0.5
    
    # Verify the title was saved
    assert_equal "Renamed Subtask via Enter", subtask_title.text_content
    
    # Verify subtask is no longer in edit mode
    assert subtask_title.evaluate("el => el.contentEditable === 'true' && document.activeElement !== el")
    
    # Refresh page to verify persistence
    @page.reload
    sleep 0.5
    
    updated_subtask_title = @page.locator('.subtask-item[data-task-id="' + @subtask.id.to_s + '"] .subtask-title').first
    assert_equal "Renamed Subtask via Enter", updated_subtask_title.text_content
  end

  test "rename job title by pressing Enter key" do
    visit "/clients/#{@client.id}/jobs/#{@job.id}"
    sleep 0.5
    ensure_csrf_token
    
    # Click on the job title to edit
    job_title = @page.locator('.job-title').first
    job_title.click
    
    # Clear and type new title
    job_title.fill("Renamed Job Title via Enter")
    
    # Press Enter to save
    job_title.press("Enter")
    
    # Wait for save
    sleep 0.5
    
    # Verify the title was saved
    assert_equal "Renamed Job Title via Enter", job_title.text_content
    
    # Verify job title is no longer in edit mode
    assert job_title.evaluate("el => document.activeElement !== el")
    
    # Refresh page to verify persistence
    @page.reload
    sleep 0.5
    
    updated_job_title = @page.locator('.job-title').first
    assert_equal "Renamed Job Title via Enter", updated_job_title.text_content
  end


  private

  def sign_in_as(user)
    visit "/login"
    fill_in "#email", with: user.email
    fill_in "#password", with: "secret123"
    click_on "Sign In"
    wait_for_navigation
  end
  
  def wait_for_navigation
    sleep 0.5
  end
  
  def ensure_csrf_token
    @page.evaluate(<<~JS)
      if (!document.querySelector('meta[name="csrf-token"]')) {
        const meta = document.createElement('meta');
        meta.name = 'csrf-token';
        meta.content = 'test-token';
        document.head.appendChild(meta);
      }
    JS
  end
end