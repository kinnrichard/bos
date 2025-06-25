require "test_helper"

class AuthorizationTest < ActionDispatch::IntegrationTest
  setup do
    @owner = users(:owner)
    @admin = users(:admin)
    @technician = users(:technician)

    @acme_client = clients(:acme)
    @techstartup_client = clients(:techstartup)

    # Create jobs for testing
    @acme_job = @acme_client.jobs.create!(
      title: "ACME Job",
      created_by: @admin,
      status: "open"
    )

    @techstartup_job = @techstartup_client.jobs.create!(
      title: "TechStartup Job",
      created_by: @admin,
      status: "open"
    )

    # Create people for testing
    @acme_person = @acme_client.people.create!(name: "ACME Employee")
    @techstartup_person = @techstartup_client.people.create!(name: "TechStartup Employee")

    # Create devices for testing
    @acme_device = @acme_client.devices.create!(
      name: "ACME Laptop",
      model: "Dell XPS 15"
    )
    @techstartup_device = @techstartup_client.devices.create!(
      name: "TechStartup Server",
      model: "HP ProLiant"
    )
  end

  # Cross-client access tests
  test "prevents admin users from accessing TechStartup Inc jobs" do
    sign_in_as @admin

    # Can access ACME client's job
    get client_job_path(@acme_client, @acme_job)
    assert_response :success

    # Admin cannot access TechStartup Inc's job (based on ApplicationController logic)
    get client_job_path(@techstartup_client, @techstartup_job)
    assert_redirected_to root_path
    assert_equal "Access denied", flash[:alert]
  end

  test "owner and technician can access any client's jobs" do
    # Owner can access all clients
    sign_in_as @owner
    get client_job_path(@techstartup_client, @techstartup_job)
    assert_response :success

    # Technician can access all clients
    sign_in_as @technician
    get client_job_path(@techstartup_client, @techstartup_job)
    assert_response :success
  end

  test "prevents cross-client access to people" do
    sign_in_as @admin

    # Can access own client's person
    get client_person_path(@acme_client, @acme_person)
    assert_response :success

    # Cannot access other client's person
    get client_person_path(@techstartup_client, @techstartup_person)
    assert_redirected_to root_path
    assert_equal "Access denied", flash[:alert]
  end

  test "prevents cross-client access to devices" do
    sign_in_as @admin

    # Can access own client's device
    get client_device_path(@acme_client, @acme_device)
    assert_response :success

    # Cannot access other client's device
    get client_device_path(@techstartup_client, @techstartup_device)
    assert_redirected_to root_path
    assert_equal "Access denied", flash[:alert]
  end

  test "prevents admin from creating jobs for TechStartup Inc" do
    sign_in_as @admin

    # Admin cannot create job for TechStartup Inc
    assert_no_difference "Job.count" do
      post client_jobs_path(@techstartup_client), params: {
        job: { title: "Unauthorized Job" }
      }
    end
    assert_redirected_to root_path
    assert_equal "Access denied", flash[:alert]

    # Admin cannot create person for TechStartup Inc
    assert_no_difference "Person.count" do
      post client_people_path(@techstartup_client), params: {
        person: { name: "New Person" }
      }
    end
    assert_redirected_to root_path
    assert_equal "Access denied", flash[:alert]

    # Admin cannot create device for TechStartup Inc
    assert_no_difference "Device.count" do
      post client_devices_path(@techstartup_client), params: {
        device: { name: "New Device", model: "MacBook Pro" }
      }
    end
    assert_redirected_to root_path
    assert_equal "Access denied", flash[:alert]
  end

  # Role-based permission tests
  test "owner can delete any resource" do
    sign_in_as @owner

    # Can delete job
    job = @acme_client.jobs.create!(
      title: "To Delete",
      created_by: @admin,
      status: "cancelled"
    )

    assert_difference "Job.count", -1 do
      delete client_job_path(@acme_client, job)
    end
    assert_redirected_to client_jobs_path(@acme_client)

    # Can delete person
    person = @acme_client.people.create!(name: "To Delete")

    assert_difference "Person.count", -1 do
      delete client_person_path(@acme_client, person)
    end
    assert_redirected_to client_people_path(@acme_client)

    # Can delete device
    device = @acme_client.devices.create!(
      name: "To Delete",
      model: "Laptop"
    )

    assert_difference "Device.count", -1 do
      delete client_device_path(@acme_client, device)
    end
    assert_redirected_to client_devices_path(@acme_client)
  end

  test "admin can delete resources with restrictions" do
    sign_in_as @admin

    # Can delete cancelled job
    job = @acme_client.jobs.create!(
      title: "Cancelled Job",
      created_by: @admin,
      status: "cancelled"
    )

    assert_difference "Job.count", -1 do
      delete client_job_path(@acme_client, job)
    end

    # Cannot delete active job
    active_job = @acme_client.jobs.create!(
      title: "Active Job",
      created_by: @admin,
      status: "in_progress"
    )

    assert_no_difference "Job.count" do
      delete client_job_path(@acme_client, active_job)
    end

    # Can delete person as admin
    person = @acme_client.people.create!(name: "Admin Delete")

    assert_difference "Person.count", -1 do
      delete client_person_path(@acme_client, person)
    end
    assert_redirected_to client_people_path(@acme_client)

    # Can delete device as admin
    device = @acme_client.devices.create!(
      name: "Admin Delete",
      model: "Laptop"
    )

    assert_difference "Device.count", -1 do
      delete client_device_path(@acme_client, device)
    end
    assert_redirected_to client_devices_path(@acme_client)
  end

  test "technician has limited delete permissions" do
    sign_in_as @technician

    # Can delete own cancelled job
    own_job = @acme_client.jobs.create!(
      title: "Tech's Job",
      created_by: @technician,
      status: "cancelled"
    )

    assert_difference "Job.count", -1 do
      delete client_job_path(@acme_client, own_job)
    end

    # Cannot delete others' jobs
    others_job = @acme_client.jobs.create!(
      title: "Admin's Job",
      created_by: @admin,
      status: "cancelled"
    )

    assert_no_difference "Job.count" do
      delete client_job_path(@acme_client, others_job)
    end
    assert_redirected_to client_jobs_path(@acme_client)
    assert_equal "You do not have permission to delete this job.", flash[:alert]

    # Cannot delete person
    person = @acme_client.people.create!(name: "Person")

    assert_no_difference "Person.count" do
      delete client_person_path(@acme_client, person)
    end
    assert_redirected_to client_people_path(@acme_client)
    assert_equal "You do not have permission to delete this person.", flash[:alert]

    # Cannot delete device
    device = @acme_client.devices.create!(
      name: "Device",
      model: "Laptop"
    )

    assert_no_difference "Device.count" do
      delete client_device_path(@acme_client, device)
    end
    assert_redirected_to client_devices_path(@acme_client)
    assert_equal "You do not have permission to delete this device.", flash[:alert]
  end

  # Update permission tests
  test "all roles can update jobs" do
    [ @owner, @admin, @technician ].each do |user|
      sign_in_as user

      job = @acme_client.jobs.create!(
        title: "Original Title",
        created_by: @admin
      )

      patch client_job_path(@acme_client, job), params: {
        job: { title: "Updated by #{user.role}" }
      }

      assert_redirected_to client_job_path(@acme_client, job)
      job.reload
      assert_equal "Updated by #{user.role}", job.title
    end
  end

  test "all roles can update people" do
    [ @owner, @admin, @technician ].each do |user|
      sign_in_as user

      person = @acme_client.people.create!(name: "Original Name")

      patch client_person_path(@acme_client, person), params: {
        person: { name: "Updated by #{user.role}" }
      }

      assert_redirected_to client_person_path(@acme_client, person)
      person.reload
      assert_equal "Updated by #{user.role}", person.name
    end
  end

  test "all roles can update devices" do
    [ @owner, @admin, @technician ].each do |user|
      sign_in_as user

      device = @acme_client.devices.create!(
        name: "Original Device",
        model: "Laptop"
      )

      patch client_device_path(@acme_client, device), params: {
        device: { name: "Updated by #{user.role}" }
      }

      assert_redirected_to client_device_path(@acme_client, device)
      device.reload
      assert_equal "Updated by #{user.role}", device.name
    end
  end

  # Create permission tests
  test "all roles can create resources" do
    [ @owner, @admin, @technician ].each do |user|
      sign_in_as user

      # Can create job
      assert_difference "Job.count", 1 do
        post client_jobs_path(@acme_client), params: {
          job: { title: "Job by #{user.role}" }
        }
      end

      # Can create person
      assert_difference "Person.count", 1 do
        post client_people_path(@acme_client), params: {
          person: { name: "Person by #{user.role}" }
        }
      end

      # Can create device
      assert_difference "Device.count", 1 do
        post client_devices_path(@acme_client), params: {
          device: {
            name: "Device by #{user.role}",
            model: "Laptop"
          }
        }
      end
    end
  end

  # Task permission tests
  test "users can manage tasks within accessible jobs" do
    sign_in_as @admin

    task = @acme_job.tasks.create!(
      title: "Original Task",
      position: 1
    )

    # Can update task
    patch client_job_task_path(@acme_client, @acme_job, task), params: {
      task: { title: "Updated Task" }
    }
    assert_redirected_to client_job_path(@acme_client, @acme_job)

    # Can reorder task
    patch reorder_client_job_task_path(@acme_client, @acme_job, task), params: {
      position: 2
    }
    assert_response :success

    # Admin cannot access tasks in TechStartup Inc jobs
    techstartup_task = @techstartup_job.tasks.create!(
      title: "TechStartup Task",
      position: 1
    )

    patch client_job_task_path(@techstartup_client, @techstartup_job, techstartup_task), params: {
      task: { title: "Hacked" }
    }
    assert_redirected_to root_path
    assert_equal "Access denied", flash[:alert]
  end

  # Settings access tests
  test "only owner can access user management" do
    # Owner can access
    sign_in_as @owner
    get users_path
    assert_response :success

    # Admin cannot access
    sign_in_as @admin
    get users_path
    assert_redirected_to root_path
    assert_equal "You don't have permission to access this page.", flash[:alert]

    # Technician cannot access
    sign_in_as @technician
    get users_path
    assert_redirected_to root_path
    assert_equal "You don't have permission to access this page.", flash[:alert]
  end

  # Edge case: switching between clients
  test "authorization is checked when switching between clients" do
    sign_in_as @admin

    # Access ACME client
    get client_jobs_path(@acme_client)
    assert_response :success

    # Try to switch to TechStartup client
    get client_jobs_path(@techstartup_client)
    assert_redirected_to root_path
    assert_equal "Access denied", flash[:alert]

    # Can still access ACME after failed attempt
    get client_jobs_path(@acme_client)
    assert_response :success
  end

  # Activity log access
  test "users can only see logs for accessible resources" do
    sign_in_as @admin

    # Can see logs for ACME client
    get logs_client_path(@acme_client)
    assert_response :success

    # Cannot see logs for TechStartup client
    get logs_client_path(@techstartup_client)
    assert_redirected_to root_path
    assert_equal "Access denied", flash[:alert]
  end

  # Nested resource authorization
  test "authorization cascades through nested resources" do
    sign_in_as @admin

    # Create contact method for person
    contact = @acme_person.contact_methods.create!(
      contact_type: "email",
      value: "test@example.com"
    )

    # Can access nested resource in accessible client
    get edit_client_person_path(@acme_client, @acme_person)
    assert_response :success

    # Cannot access nested resource in inaccessible client
    techstartup_contact = @techstartup_person.contact_methods.create!(
      contact_type: "email",
      value: "tech@example.com"
    )

    get edit_client_person_path(@techstartup_client, @techstartup_person)
    assert_redirected_to root_path
  end
end
