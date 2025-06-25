require "test_helper"

class JobWorkflowTest < ActionDispatch::IntegrationTest
  setup do
    @client = clients(:acme)
    @owner = users(:owner)
    @admin = users(:admin)
    @technician = users(:technician)

    # Sign in as admin by default
    sign_in_as @admin

    # Create fresh job for each test
    @job = @client.jobs.create!(
      title: "Server Maintenance",
      status: "open",
      priority: "normal",
      created_by: @admin,
      description: "Perform routine server maintenance"
    )
  end

  # Complete job workflow
  test "complete job creation to completion workflow" do
    # Step 1: Create job with initial details
    post client_jobs_path(@client), params: {
      job: {
        title: "New Server Setup",
        priority: "high",
        status: "open",
        description: "Install and configure new web server"
      }
    }

    assert_redirected_to client_job_path(@client, Job.last)
    job = Job.last
    assert_equal "New Server Setup", job.title
    assert_equal "high", job.priority
    assert_equal "open", job.status

    # Step 2: Add technicians
    patch client_job_path(@client, job), params: {
      job: {
        technician_ids: [ @admin.id, @technician.id ]
      }
    }

    assert_redirected_to client_job_path(@client, job)
    assert_includes job.reload.technician_ids, @admin.id
    assert_includes job.technician_ids, @technician.id

    # Step 3: Add tasks
    post client_job_tasks_path(@client, job), params: {
      task: {
        title: "Install OS",
        status: "new_task"
      }
    }

    assert_redirected_to client_job_path(@client, job)
    assert_equal 1, job.reload.tasks.count

    # Step 4: Start working on job
    patch client_job_path(@client, job), params: {
      job: { status: "in_progress" }
    }

    assert_equal "in_progress", job.reload.status

    # Step 5: Complete tasks
    task = job.tasks.first
    patch client_job_task_path(@client, job, task), params: {
      task: { status: "successfully_completed" }
    }

    assert_equal "successfully_completed", task.reload.status

    # Step 6: Complete job
    patch client_job_path(@client, job), params: {
      job: { status: "successfully_completed" }
    }

    assert_equal "successfully_completed", job.reload.status
    assert_not_nil job.updated_at
  end

  # Status transitions
  test "valid job status transitions" do
    # open -> in_progress
    patch client_job_path(@client, @job), params: {
      job: { status: "in_progress" }
    }

    assert_equal "in_progress", @job.reload.status

    # in_progress -> waiting_for_customer
    patch client_job_path(@client, @job), params: {
      job: { status: "waiting_for_customer" }
    }

    assert_equal "waiting_for_customer", @job.reload.status

    # waiting_for_customer -> in_progress
    patch client_job_path(@client, @job), params: {
      job: { status: "in_progress" }
    }

    assert_equal "in_progress", @job.reload.status

    # in_progress -> successfully_completed
    patch client_job_path(@client, @job), params: {
      job: { status: "successfully_completed" }
    }

    assert_equal "successfully_completed", @job.reload.status
  end

  test "cancelling job at any stage" do
    # Can cancel from open
    assert_equal "open", @job.status

    patch client_job_path(@client, @job), params: {
      job: { status: "cancelled" }
    }

    assert_equal "cancelled", @job.reload.status

    # Can cancel from in_progress
    job2 = @client.jobs.create!(
      title: "Another Job",
      status: "in_progress",
      created_by: @admin
    )

    patch client_job_path(@client, job2), params: {
      job: { status: "cancelled" }
    }

    assert_equal "cancelled", job2.reload.status
  end

  # Task management within job workflow
  test "task creation and management during job lifecycle" do
    # Add multiple tasks
    3.times do |i|
      post client_job_tasks_path(@client, @job), params: {
        task: {
          title: "Task #{i + 1}",
          status: "new_task"
        }
      }
    end

    assert_equal 3, @job.reload.tasks.count

    # Start job
    patch client_job_path(@client, @job), params: {
      job: { status: "in_progress" }
    }

    # Work on tasks in order
    @job.tasks.order(:position).each_with_index do |task, index|
      # Start task
      patch client_job_task_path(@client, @job, task), params: {
        task: { status: "in_progress" }
      }

      assert_equal "in_progress", task.reload.status

      # Complete task
      travel 1.minute do
        patch client_job_task_path(@client, @job, task), params: {
          task: { status: "successfully_completed" }
        }
      end

      assert_equal "successfully_completed", task.reload.status
      assert_not_nil task.updated_at
    end

    # All tasks completed, job can be completed
    patch client_job_path(@client, @job), params: {
      job: { status: "successfully_completed" }
    }

    assert_equal "successfully_completed", @job.reload.status
  end

  # Subtask workflow
  test "nested task workflow with subtasks" do
    # Create parent task
    post client_job_tasks_path(@client, @job), params: {
      task: {
        title: "Setup Server",
        status: "new_task"
      }
    }

    parent_task = @job.tasks.last

    # Create subtasks
    2.times do |i|
      post client_job_tasks_path(@client, @job), params: {
        task: {
          title: "Subtask #{i + 1}",
          parent_id: parent_task.id,
          status: "new_task"
        }
      }
    end

    assert_equal 2, parent_task.reload.subtasks.count

    # Complete subtasks first
    parent_task.subtasks.each do |subtask|
      patch client_job_task_path(@client, @job, subtask), params: {
        task: { status: "successfully_completed" }
      }
    end

    # Then complete parent
    patch client_job_task_path(@client, @job, parent_task), params: {
      task: { status: "successfully_completed" }
    }

    assert_equal "successfully_completed", parent_task.reload.status
  end

  # Job assignment workflow
  test "job assignment and reassignment workflow" do
    # Initially no assignments
    assert_empty @job.technicians

    # Assign single technician
    patch client_job_path(@client, @job), params: {
      job: { technician_ids: [ @technician.id ] }
    }

    assert_equal 1, @job.reload.technicians.count
    assert_includes @job.technician_ids, @technician.id

    # Add more technicians
    patch client_job_path(@client, @job), params: {
      job: { technician_ids: [ @technician.id, @admin.id ] }
    }

    assert_equal 2, @job.reload.technicians.count

    # Reassign to different technician
    other_tech = users(:technician_two)
    patch client_job_path(@client, @job), params: {
      job: { technician_ids: [ other_tech.id ] }
    }

    assert_equal 1, @job.reload.technicians.count
    assert_includes @job.technician_ids, other_tech.id
    assert_not_includes @job.technician_ids, @technician.id

    # Clear all assignments
    patch client_job_path(@client, @job), params: {
      job: { technician_ids: [ "" ] }
    }

    assert_empty @job.reload.technicians
  end

  # Priority changes during workflow
  test "priority changes affect job ordering" do
    # Create multiple jobs with different priorities
    normal_job = @client.jobs.create!(
      title: "Normal Priority",
      priority: "normal",
      created_by: @admin
    )

    high_job = @client.jobs.create!(
      title: "High Priority",
      priority: "high",
      created_by: @admin
    )

    low_job = @client.jobs.create!(
      title: "Low Priority",
      priority: "low",
      created_by: @admin
    )

    # Verify ordering (critical=0, high=1, normal=2, low=3)
    jobs = [ high_job, normal_job, low_job ].sort_by { |j| Job.priorities[j.priority] }
    assert_equal "high", jobs[0].priority
    assert_equal "normal", jobs[1].priority
    assert_equal "low", jobs[2].priority

    # Change priority mid-workflow
    patch client_job_path(@client, normal_job), params: {
      job: { priority: "critical" }
    }

    # Verify new ordering
    normal_job.reload
    jobs = [ high_job, normal_job, low_job ].sort_by { |j| j.priority }
    assert_equal "critical", jobs[0].priority # normal_job is now critical
    assert_equal "high", jobs[1].priority
  end

  # Due date handling
  test "due date management throughout workflow" do
    # Set initial due date
    due_date = 3.days.from_now
    patch client_job_path(@client, @job), params: {
      job: {
        due_on: due_date.to_date,
        due_time: "17:00"
      }
    }

    @job.reload
    assert_equal due_date.to_date, @job.due_on
    assert_equal "17:00", @job.due_time.strftime("%H:%M")

    # Job becomes overdue
    travel_to due_date + 1.day do
      assert @job.overdue?

      # Complete overdue job
      patch client_job_path(@client, @job), params: {
        job: { status: "successfully_completed" }
      }

      assert_equal "successfully_completed", @job.reload.status
      # Job was completed after due date
    end
  end

  # Activity logging throughout workflow
  test "activity logs track complete job lifecycle" do
    # Clear any existing logs from setup or other tests
    ActivityLog.destroy_all

    # Create job - logs creation (both from Loggable concern and controller)
    post client_jobs_path(@client), params: {
      job: {
        title: "Tracked Job",
        priority: "normal"
      }
    }

    job = Job.last
    logs_after_create = ActivityLog.count
    # Expect 2 logs: one from Loggable concern, one from controller
    assert_equal 2, logs_after_create
    assert_equal "created", ActivityLog.last.action

    # Assign technician - logs assignment
    patch client_job_path(@client, job), params: {
      job: { technician_ids: [ @technician.id ] }
    }

    logs_after_assign = ActivityLog.count
    assert logs_after_assign > logs_after_create
    assert_includes [ "updated", "assigned" ], ActivityLog.last.action

    # Start job - logs status change
    patch client_job_path(@client, job), params: {
      job: { status: "in_progress" }
    }

    logs_after_start = ActivityLog.count
    assert logs_after_start > logs_after_assign
    assert_includes [ "updated", "status_changed" ], ActivityLog.last.action

    # Add task - might or might not log task creation depending on implementation
    post client_job_tasks_path(@client, job), params: {
      task: { title: "Tracked Task", status: "new_task" }
    }

    logs_before_complete = ActivityLog.count

    # Complete job - logs completion
    patch client_job_path(@client, job), params: {
      job: { status: "successfully_completed" }
    }

    # Should have more logs for completion (status_changed from Loggable + updated from controller)
    assert ActivityLog.count > logs_before_complete

    # Verify all logs are associated correctly
    job_logs = ActivityLog.where(loggable: job)
    assert job_logs.count >= 3 # At least create, update/assign, complete
  end

  # Multi-user workflow
  test "multiple users working on same job" do
    # Admin creates job
    sign_in_as @admin
    post client_jobs_path(@client), params: {
      job: {
        title: "Collaborative Job",
        technician_ids: [ @admin.id, @technician.id ]
      }
    }

    job = Job.last
    assert_equal @admin, job.created_by

    # Technician adds task
    sign_in_as @technician
    post client_job_tasks_path(@client, job), params: {
      task: { title: "Tech's Task", status: "new_task" }
    }

    task1 = job.tasks.last

    # Admin adds another task
    sign_in_as @admin
    post client_job_tasks_path(@client, job), params: {
      task: { title: "Admin's Task", status: "new_task" }
    }

    task2 = job.tasks.last

    # Both work on their tasks
    sign_in_as @technician
    patch client_job_task_path(@client, job, task1), params: {
      task: { status: "successfully_completed" }
    }

    sign_in_as @admin
    patch client_job_task_path(@client, job, task2), params: {
      task: { status: "successfully_completed" }
    }

    # Admin completes job
    patch client_job_path(@client, job), params: {
      job: { status: "successfully_completed" }
    }

    assert_equal "successfully_completed", job.reload.status
    assert_equal 2, job.tasks.successfully_completed.count
  end

  # Error recovery workflow
  test "handling errors during job workflow" do
    # Try to update with invalid data
    patch client_job_path(@client, @job), params: {
      job: { title: "" } # Invalid - title required
    }

    assert_response :unprocessable_entity
    assert_not_equal "", @job.reload.title # Title unchanged

    # Try to complete job with pending tasks
    post client_job_tasks_path(@client, @job), params: {
      task: { title: "Incomplete Task", status: "new_task" }
    }

    patch client_job_path(@client, @job), params: {
      job: { status: "successfully_completed" }
    }

    # Currently the system allows completing jobs with pending tasks
    @job.reload
    assert_equal "successfully_completed", @job.status

    # Tasks remain in their original state (no auto-completion)
    assert @job.tasks.where(status: "new_task").exists?
  end

  # Job cloning workflow
  test "cloning job for recurring work" do
    # Setup original job with tasks
    @job.update!(
      description: "Monthly maintenance",
      priority: "high",
      due_on: 1.month.from_now
    )

    3.times do |i|
      @job.tasks.create!(
        title: "Recurring Task #{i + 1}",
        status: "new_task",
        position: (i + 1) * 10
      )
    end

    # Clone job (would be a custom action)
    original_task_count = @job.tasks.count
    original_title = @job.title

    # Create new job based on original
    post client_jobs_path(@client), params: {
      job: {
        title: "#{original_title} (Copy)",
        description: @job.description,
        priority: @job.priority,
        status: "open"
      }
    }

    new_job = Job.last

    # Copy tasks
    @job.tasks.each do |task|
      post client_job_tasks_path(@client, new_job), params: {
        task: {
          title: task.title,
          status: "new_task",
          position: task.position
        }
      }
    end

    assert_equal original_task_count, new_job.reload.tasks.count
    assert_equal "open", new_job.status
    assert_not_equal @job.id, new_job.id
  end

  # Concurrent workflow updates
  test "handling concurrent job updates" do
    # Simulate two users updating job simultaneously
    job = @client.jobs.create!(
      title: "Concurrent Updates Test",
      created_by: @admin,
      status: "open"
    )

    # User 1 loads job
    sign_in_as @admin
    get edit_client_job_path(@client, job)
    assert_response :success

    # User 2 updates job
    sign_in_as @technician
    patch client_job_path(@client, job), params: {
      job: { priority: "high" }
    }

    assert_equal "high", job.reload.priority

    # User 1 tries to update with stale data
    sign_in_as @admin
    patch client_job_path(@client, job), params: {
      job: {
        priority: "low",
        description: "Updated description"
      }
    }

    # Both updates should succeed (no optimistic locking)
    job.reload
    assert_equal "low", job.priority
    assert_equal "Updated description", job.description
  end

  # Job templates workflow (future feature simulation)
  test "creating job from common templates" do
    # Simulate template selection
    template_data = {
      title: "Server Security Audit",
      priority: "high",
      description: "Perform comprehensive security audit",
      task_templates: [
        { title: "Check firewall rules", position: 10 },
        { title: "Review user permissions", position: 20 },
        { title: "Update security patches", position: 30 },
        { title: "Generate audit report", position: 40 }
      ]
    }

    # Create job from template
    post client_jobs_path(@client), params: {
      job: {
        title: template_data[:title],
        priority: template_data[:priority],
        description: template_data[:description]
      }
    }

    job = Job.last

    # Create tasks from template
    template_data[:task_templates].each do |task_template|
      post client_job_tasks_path(@client, job), params: {
        task: {
          title: task_template[:title],
          position: task_template[:position],
          status: "new_task"
        }
      }
    end

    assert_equal 4, job.reload.tasks.count
    assert_equal [ "Check firewall rules", "Review user permissions",
                  "Update security patches", "Generate audit report" ],
                 job.tasks.order(:position).pluck(:title)
  end

  # Scheduled job workflow
  test "scheduled job activation workflow" do
    # Create future scheduled job
    scheduled_date = 1.week.from_now

    post client_jobs_path(@client), params: {
      job: {
        title: "Scheduled Maintenance",
        status: "waiting_for_scheduled_appointment",
        scheduled_for: scheduled_date
      }
    }

    job = Job.last

    # Job should appear in active jobs (waiting_for_scheduled_appointment is active)
    assert_includes Job.active.pluck(:id), job.id

    # Simulate reaching scheduled date
    travel_to scheduled_date do
      # Activate job (would be automated)
      patch client_job_path(@client, job), params: {
        job: { status: "open" }
      }

      assert_equal "open", job.reload.status
      assert_includes Job.active.pluck(:id), job.id
    end
  end
end
