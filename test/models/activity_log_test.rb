require "test_helper"

class ActivityLogTest < ActiveSupport::TestCase
  setup do
    @user = users(:admin)
    @client = clients(:acme)
    @job = jobs(:open_job)
    @task = tasks(:open_task_1)
    sign_in_as @user
  end

  test "valid activity log attributes" do
    log = ActivityLog.new(
      user: @user,
      action: "created",
      loggable: @job,
      client: @client,
      job: @job,
      metadata: { name: "Test Job" }
    )

    assert_valid log
  end

  test "requires user" do
    log = ActivityLog.new(action: "created", loggable: @job)

    assert_invalid log, attribute: :user
  end

  test "requires action" do
    log = ActivityLog.new(user: @user, loggable: @job)

    assert_invalid log, attribute: :action
  end

  test "allows optional loggable" do
    log = ActivityLog.new(user: @user, action: "logged_in")

    assert_valid log
  end

  test "allows optional client" do
    log = ActivityLog.new(user: @user, action: "logged_in")

    assert_valid log
  end

  test "allows optional job" do
    log = ActivityLog.new(user: @user, action: "created", loggable: @client)

    assert_valid log
  end

  test "recent scope orders by created_at descending" do
    # Clear existing logs to ensure clean test
    ActivityLog.destroy_all

    old_log = ActivityLog.create!(
      user: @user,
      action: "created",
      loggable: @job,
      created_at: 2.days.ago
    )

    new_log = ActivityLog.create!(
      user: @user,
      action: "updated",
      loggable: @job,
      created_at: 1.hour.ago
    )

    recent_logs = ActivityLog.recent

    assert_equal new_log.id, recent_logs.first.id
    assert_equal old_log.id, recent_logs.last.id
  end

  test "for_user scope" do
    tech = users(:technician)

    admin_log = ActivityLog.create!(user: @user, action: "created", loggable: @job)
    tech_log = ActivityLog.create!(user: tech, action: "updated", loggable: @job)

    admin_logs = ActivityLog.for_user(@user)

    assert_includes admin_logs, admin_log
    assert_not_includes admin_logs, tech_log
  end

  test "for_loggable scope" do
    other_job = @client.jobs.create!(title: "Other Job", created_by: @user)

    job_log = ActivityLog.create!(user: @user, action: "created", loggable: @job)
    other_log = ActivityLog.create!(user: @user, action: "created", loggable: other_job)

    job_logs = ActivityLog.for_loggable(@job)

    assert_includes job_logs, job_log
    assert_not_includes job_logs, other_log
  end

  test "for_client scope" do
    other_client = clients(:techstartup)

    acme_log = ActivityLog.create!(user: @user, action: "created", loggable: @job, client: @client)
    tech_log = ActivityLog.create!(user: @user, action: "created", loggable: other_client, client: other_client)

    acme_logs = ActivityLog.for_client(@client)

    assert_includes acme_logs, acme_log
    assert_not_includes acme_logs, tech_log
  end

  test "loggable_type_emoji for different types" do
    # Client (business)
    business_client = clients(:techstartup) # client_type: business
    log = ActivityLog.new(action: "created", loggable: business_client)
    assert_equal "🏢", log.loggable_type_emoji

    # Client (residential) - acme is actually business, so let's use a different approach
    residential_client = Client.create!(name: "Test Residential", client_type: "residential")
    log = ActivityLog.new(action: "created", loggable: residential_client)
    assert_equal "🏠", log.loggable_type_emoji

    # Job
    log = ActivityLog.new(action: "created", loggable: @job)
    assert_equal "💼", log.loggable_type_emoji

    # Task
    log = ActivityLog.new(action: "created", loggable: @task)
    assert_equal "☑️", log.loggable_type_emoji

    # Person
    person = people(:john_doe)
    log = ActivityLog.new(action: "created", loggable: person)
    assert_equal "👤", log.loggable_type_emoji

    # Unknown type
    log = ActivityLog.new(action: "created", loggable_type: "Device")
    assert_equal "", log.loggable_type_emoji
  end

  test "loggable_name from metadata" do
    log = ActivityLog.new(
      action: "created",
      loggable: @job,
      metadata: { "name" => "Custom Name" }
    )

    assert_equal "Custom Name", log.loggable_name
  end

  test "loggable_name fallback for different types" do
    # Job
    log = ActivityLog.new(action: "created", loggable: @job, metadata: {})
    assert_equal @job.title, log.loggable_name

    # Task
    log = ActivityLog.new(action: "created", loggable: @task, metadata: {})
    assert_equal @task.title, log.loggable_name

    # Client
    log = ActivityLog.new(action: "created", loggable: @client, metadata: {})
    assert_equal @client.name, log.loggable_name

    # Person
    person = people(:john_doe)
    log = ActivityLog.new(action: "created", loggable: person, metadata: {})
    assert_match person.name, log.loggable_name
    assert_match @client.name, log.loggable_name # Should include client name
  end

  test "loggable_name handles nil metadata" do
    log = ActivityLog.new(action: "created", loggable: @job, metadata: nil)
    assert_equal "no metadata", log.loggable_name
  end

  test "message for created action" do
    # Job creation
    log = ActivityLog.new(
      action: "created",
      loggable: @job,
      metadata: { "name" => "New Job" }
    )
    assert_equal "created 💼 New Job", log.message

    # Task creation with job context
    log = ActivityLog.new(
      action: "created",
      loggable: @task,
      metadata: { "name" => "New Task" }
    )
    assert_equal "created ☑️ New Task in 💼 #{@task.job.title}", log.message
  end

  test "message for viewed action" do
    log = ActivityLog.new(
      action: "viewed",
      loggable: @job,
      metadata: { "name" => "Job Title" }
    )

    assert_equal "viewed 💼 Job Title", log.message
  end

  test "message for renamed action" do
    log = ActivityLog.new(
      action: "renamed",
      loggable: @job,
      metadata: {
        "old_name" => "Old Title",
        "new_name" => "New Title"
      }
    )

    assert_equal "renamed Old Title to New Title", log.message
  end

  test "message for updated action with changes" do
    log = ActivityLog.new(
      action: "updated",
      loggable: @job,
      metadata: {
        "name" => "Job Title",
        "changes" => {
          "status" => [ "open", "in_progress" ],
          "priority" => [ "normal", "high" ]
        }
      }
    )

    message = log.message
    assert_match "updated Job Title:", message
    assert_match "status from 'open' to 'in_progress'", message
    assert_match "priority from 'normal' to 'high'", message
  end

  test "message for updated action without changes" do
    log = ActivityLog.new(
      action: "updated",
      loggable: @job,
      metadata: { "name" => "Job Title" }
    )

    assert_equal "updated Job Title", log.message
  end

  test "message for deleted action" do
    log = ActivityLog.new(
      action: "deleted",
      loggable_type: "Job",
      metadata: { "name" => "Deleted Job" }
    )

    assert_equal "deleted 💼 Deleted Job", log.message
  end

  test "message for assigned action" do
    log = ActivityLog.new(
      action: "assigned",
      loggable: @job,
      metadata: {
        "name" => "Job Title",
        "assigned_to" => "John Doe"
      }
    )

    assert_equal "assigned 💼 Job Title to John Doe", log.message
  end

  test "message for unassigned action" do
    log = ActivityLog.new(
      action: "unassigned",
      loggable: @job,
      metadata: {
        "name" => "Job Title",
        "unassigned_from" => "John Doe"
      }
    )

    assert_equal "unassigned John Doe from 💼 Job Title", log.message
  end

  test "message for status_changed action" do
    log = ActivityLog.new(
      action: "status_changed",
      loggable: @task,
      metadata: {
        "name" => "Task Title",
        "new_status" => "in_progress",
        "new_status_label" => "In Progress"
      }
    )

    assert_equal "marked ☑️ Task Title 🟢 In Progress", log.message
  end

  test "message for added action" do
    log = ActivityLog.new(
      action: "added",
      loggable_type: "Device",
      metadata: {
        "name" => "MacBook Pro",
        "parent_type" => "Person",
        "parent_name" => "John Doe"
      }
    )

    assert_equal "added  MacBook Pro to Person John Doe", log.message
  end

  test "message for logged_in action" do
    log = ActivityLog.new(action: "logged_in", user: @user)

    assert_equal "signed into bŏs", log.message
  end

  test "message for logged_out action" do
    log = ActivityLog.new(action: "logged_out", user: @user)

    assert_equal "signed out of bŏs", log.message
  end

  test "message for unknown action" do
    log = ActivityLog.new(
      action: "custom_action",
      loggable: @job,
      metadata: { "name" => "Job Title" }
    )

    assert_equal "••• custom_action Job Title", log.message
  end

  test "get_status_emoji for different statuses" do
    log = ActivityLog.new(action: "status_changed", loggable: @task)

    # Test each status emoji using send to call private method
    assert_equal "⚫️", log.send(:get_status_emoji, "new_task")
    assert_equal "🟢", log.send(:get_status_emoji, "in_progress")
    assert_equal "⏸️", log.send(:get_status_emoji, "paused")
    assert_equal "☑️", log.send(:get_status_emoji, "successfully_completed")
    assert_equal "❌", log.send(:get_status_emoji, "cancelled")
    assert_equal "⚫", log.send(:get_status_emoji, "open")
    assert_equal "", log.send(:get_status_emoji, "unknown")
  end

  test "polymorphic associations" do
    # Can log different types
    client_log = ActivityLog.create!(
      user: @user,
      action: "created",
      loggable: @client,
      client: @client
    )

    job_log = ActivityLog.create!(
      user: @user,
      action: "created",
      loggable: @job,
      client: @client,
      job: @job
    )

    task_log = ActivityLog.create!(
      user: @user,
      action: "created",
      loggable: @task,
      client: @client,
      job: @job
    )

    assert_equal @client, client_log.loggable
    assert_equal @job, job_log.loggable
    assert_equal @task, task_log.loggable
  end

  test "metadata stored as JSONB" do
    complex_metadata = {
      "name" => "Test",
      "changes" => {
        "status" => [ "open", "closed" ],
        "priority" => [ "normal", "high" ]
      },
      "nested" => {
        "deep" => {
          "value" => "test"
        }
      }
    }

    log = ActivityLog.create!(
      user: @user,
      action: "updated",
      loggable: @job,
      metadata: complex_metadata
    )

    log.reload
    assert_equal complex_metadata["nested"]["deep"]["value"], log.metadata["nested"]["deep"]["value"]
  end

  test "activity logging integration" do
    # Create a job and verify activity log is created
    assert_difference "ActivityLog.count", 1 do
      job = @client.jobs.create!(
        title: "Test Job",
        created_by: @user,
        status: "open"
      )

      log = ActivityLog.last
      assert_equal "created", log.action
      assert_equal job, log.loggable
      assert_equal @user, log.user
      assert_equal @client, log.client
    end
  end

  test "chained scopes" do
    # Create logs for different combinations
    tech = users(:technician)
    other_client = clients(:techstartup)

    # Admin log for acme job
    admin_acme_log = ActivityLog.create!(
      user: @user,
      action: "created",
      loggable: @job,
      client: @client
    )

    # Tech log for acme job
    tech_acme_log = ActivityLog.create!(
      user: tech,
      action: "updated",
      loggable: @job,
      client: @client
    )

    # Admin log for other client
    admin_other_log = ActivityLog.create!(
      user: @user,
      action: "created",
      loggable: other_client,
      client: other_client
    )

    # Chain scopes
    admin_acme_logs = ActivityLog.for_user(@user).for_client(@client)

    assert_includes admin_acme_logs, admin_acme_log
    assert_not_includes admin_acme_logs, tech_acme_log
    assert_not_includes admin_acme_logs, admin_other_log
  end
end
