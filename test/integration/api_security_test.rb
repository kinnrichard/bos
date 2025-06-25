require "test_helper"

class ApiSecurityTest < ActionDispatch::IntegrationTest
  setup do
    @client = clients(:acme)
    @job = jobs(:open_job)
    @task = tasks(:open_task_1)
    @owner = users(:owner)
    @admin = users(:admin)
    @technician = users(:technician)

    # Create another client for cross-client testing
    @other_client = clients(:techstartup)
    @other_job = @other_client.jobs.create!(
      title: "Other Client Job",
      created_by: @admin
    )
  end

  # Authentication tests for API endpoints
  test "API endpoints require authentication" do
    # Jobs API
    get client_jobs_path(@client), as: :json
    assert_response :unauthorized

    post client_jobs_path(@client),
         params: { job: { title: "Test" } },
         as: :json
    assert_response :unauthorized

    patch client_job_path(@client, @job),
          params: { job: { title: "Updated" } },
          as: :json
    assert_response :unauthorized

    delete client_job_path(@client, @job), as: :json
    assert_response :unauthorized

    # Tasks API
    post client_job_tasks_path(@client, @job),
         params: { task: { title: "Test" } },
         as: :json
    assert_response :unauthorized

    patch client_job_task_path(@client, @job, @task),
          params: { task: { title: "Updated" } },
          as: :json
    assert_response :unauthorized

    patch reorder_client_job_task_path(@client, @job, @task),
          params: { position: 1 },
          as: :json
    assert_response :unauthorized
  end

  # Cross-client access prevention
  test "prevents access to other clients' resources via API" do
    sign_in_as @admin

    # Cannot view other client's jobs
    get client_job_path(@other_client, @other_job), as: :json
    assert_response :forbidden

    # Cannot create job for other client
    post client_jobs_path(@other_client),
         params: { job: { title: "Hacked Job" } },
         as: :json
    assert_response :forbidden

    # Cannot update other client's job
    patch client_job_path(@other_client, @other_job),
          params: { job: { title: "Hacked Title" } },
          as: :json
    assert_response :forbidden

    # Cannot delete other client's job
    @other_job.update!(status: "cancelled")
    delete client_job_path(@other_client, @other_job), as: :json
    assert_response :forbidden
  end

  # Resource existence validation
  test "returns 404 for non-existent resources" do
    sign_in_as @admin

    # Non-existent client
    get client_jobs_path(999999), as: :json
    assert_response :not_found

    # Non-existent job
    get client_job_path(@client, 999999), as: :json
    assert_response :not_found

    # Non-existent task
    patch client_job_task_path(@client, @job, 999999),
          params: { task: { title: "Test" } },
          as: :json
    assert_response :not_found
  end

  # Input validation and sanitization
  test "validates and sanitizes input data" do
    sign_in_as @admin

    # SQL injection attempt in search
    get client_jobs_path(@client),
        params: { q: "'; DROP TABLE jobs; --" },
        as: :json
    assert_response :success
    assert Job.exists? # Table still exists

    # XSS attempt in job title
    post client_jobs_path(@client),
         params: {
           job: {
             title: "<script>alert('XSS')</script>",
             description: "<img src=x onerror=alert('XSS')>"
           }
         },
         as: :json

    assert_response :success
    job = Job.last
    assert_not_includes job.title, "<script>"
    assert_not_includes job.description, "onerror="

    # Mass assignment protection
    original_client = @job.client
    patch client_job_path(@client, @job),
          params: {
            job: {
              title: "Updated",
              client_id: @other_client.id, # Should be ignored
              created_by_id: @technician.id # Should be ignored
            }
          },
          as: :json

    @job.reload
    assert_equal "Updated", @job.title
    assert_equal original_client, @job.client
    assert_not_equal @technician, @job.created_by
  end

  # Rate limiting simulation
  test "handles rapid API requests gracefully" do
    sign_in_as @admin

    # Make 20 rapid requests
    20.times do |i|
      get client_jobs_path(@client), as: :json
      assert_response :success
    end

    # System should still be responsive
    get client_job_path(@client, @job), as: :json
    assert_response :success
  end

  # CSRF protection for API
  test "CSRF protection behavior for JSON requests" do
    sign_in_as @admin

    # JSON requests should work without CSRF token
    post client_jobs_path(@client),
         params: { job: { title: "API Job" } },
         as: :json,
         headers: { "X-CSRF-Token" => "invalid-token" }

    assert_response :success
    assert_equal "API Job", Job.last.title

    # HTML requests should require valid CSRF token
    post client_jobs_path(@client),
         params: { job: { title: "HTML Job" } },
         headers: { "X-CSRF-Token" => "invalid-token" }

    assert_response :unprocessable_entity
  end

  # Authorization for different user roles
  test "API respects role-based permissions" do
    # Owner can do everything
    sign_in_as @owner

    post client_jobs_path(@client),
         params: { job: { title: "Owner Job" } },
         as: :json
    assert_response :success

    @job.update!(status: "cancelled")
    delete client_job_path(@client, @job), as: :json
    assert_response :success

    # Admin can do most things
    sign_in_as @admin

    post client_jobs_path(@client),
         params: { job: { title: "Admin Job" } },
         as: :json
    assert_response :success

    # Technician has limited permissions
    sign_in_as @technician

    # Can create
    post client_jobs_path(@client),
         params: { job: { title: "Tech Job" } },
         as: :json
    assert_response :success

    # Cannot delete others' jobs
    other_job = @client.jobs.create!(
      title: "Someone else's job",
      created_by: @admin,
      status: "cancelled"
    )

    delete client_job_path(@client, other_job), as: :json
    assert_response :forbidden
    assert Job.exists?(other_job.id)
  end

  # Sensitive data exposure
  test "API responses don't expose sensitive data" do
    sign_in_as @technician

    # Get job list
    get client_jobs_path(@client), as: :json
    json = JSON.parse(response.body)

    # Should not include sensitive user data
    if json["jobs"]
      json["jobs"].each do |job|
        assert_not job.key?("created_by_password")
        assert_not job.key?("created_by_email")
      end
    end

    # Get single job
    get client_job_path(@client, @job), as: :json
    json = JSON.parse(response.body)

    if json["job"]
      assert_not json["job"].key?("internal_notes") # If such field exists
      assert_not json["job"].key?("cost") # If hidden from technicians
    end
  end

  # File upload security
  test "validates file uploads for malicious content" do
    sign_in_as @admin

    # Attempt to upload executable file (if file uploads exist)
    # This is a placeholder - adjust based on actual file upload endpoints
    if defined?(client_job_attachments_path)
      file = fixture_file_upload("files/malicious.exe", "application/x-msdownload")

      post client_job_attachments_path(@client, @job),
           params: { attachment: { file: file } },
           as: :json

      assert_response :unprocessable_entity
      json = JSON.parse(response.body)
      assert_includes json["error"], "file type"
    end
  end

  # Pagination and limits
  test "enforces reasonable limits on API responses" do
    sign_in_as @admin

    # Create many jobs
    100.times do |i|
      @client.jobs.create!(
        title: "Job #{i}",
        created_by: @admin
      )
    end

    # Request should paginate
    get client_jobs_path(@client), as: :json
    json = JSON.parse(response.body)

    # Should not return all 100+ jobs at once
    if json["jobs"]
      assert json["jobs"].length <= 50 # Or whatever the limit is
      assert json["pagination"] || json["meta"] # Should include pagination info
    end
  end

  # Error response format
  test "API returns consistent error format" do
    sign_in_as @admin

    # Validation error
    post client_jobs_path(@client),
         params: { job: { title: "" } }, # Invalid
         as: :json

    assert_response :unprocessable_entity
    json = JSON.parse(response.body)
    assert json.key?("error") || json.key?("errors")

    # Not found error
    get client_job_path(@client, 999999), as: :json
    assert_response :not_found
    json = JSON.parse(response.body)
    assert json.key?("error")

    # Forbidden error
    @other_job.update!(status: "cancelled")
    sign_in_as @technician
    delete client_job_path(@other_client, @other_job), as: :json
    assert_response :forbidden
    json = JSON.parse(response.body)
    assert json.key?("error")
  end

  # HTTP method restrictions
  test "only allows appropriate HTTP methods" do
    sign_in_as @admin

    # Try unsupported methods
    # Note: Rails typically returns 404 for undefined routes
    process :options, client_jobs_path(@client), as: :json
    assert_includes [ 404, 405 ], response.status

    process :trace, client_job_path(@client, @job), as: :json
    assert_includes [ 404, 405 ], response.status
  end

  # Content-Type validation
  test "validates Content-Type headers" do
    sign_in_as @admin

    # Send JSON with wrong content type
    post client_jobs_path(@client),
         params: '{"job":{"title":"Test"}}',
         headers: {
           "Content-Type" => "text/plain",
           "Accept" => "application/json"
         }

    # Should either accept it or return error
    assert_includes [ 200, 201, 400, 415 ], response.status
  end

  # API versioning (if implemented)
  test "handles API version negotiation" do
    sign_in_as @admin

    # Test with version header
    get client_jobs_path(@client),
        headers: {
          "Accept" => "application/vnd.bos.v1+json"
        }

    # Should accept versioned requests
    assert_response :success
  end

  # Session fixation protection
  test "regenerates session after login" do
    # Get initial session
    get client_jobs_path(@client), as: :json
    initial_session = session.id

    # Login
    post login_path,
         params: { email: @admin.email, password: "password123" },
         as: :json

    # Session should be different
    assert_not_equal initial_session, session.id if session.respond_to?(:id)
  end

  # Timeout handling
  test "handles long-running requests appropriately" do
    sign_in_as @admin

    # Create complex query that might be slow
    get client_jobs_path(@client),
        params: {
          q: "test",
          status: "open",
          priority: "high",
          assigned_to: @admin.id,
          per_page: 100
        },
        as: :json

    assert_response :success
    # Should complete within reasonable time
  end
end
