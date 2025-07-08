# Test Environment Management
# Provides centralized test environment setup, data management, and utilities

module TestEnvironment
  extend self

  # =============================================
  # Environment Configuration
  # =============================================

  def test_environment?
    Rails.env.test?
  end

  def ensure_test_environment!
    unless test_environment?
      raise "This operation can only be performed in test environment. Current: #{Rails.env}"
    end
  end

  def debug_mode?
    ENV["DEBUG"] == "true" || ENV["PLAYWRIGHT_DEBUG"] == "true"
  end

  def headless_mode?
    !ENV["PLAYWRIGHT_HEADFUL"] && !debug_mode?
  end

  def ci_environment?
    ENV["CI"] == "true"
  end

  # =============================================
  # Database Management
  # =============================================

  def reset_database!
    ensure_test_environment!

    puts "🔄 Resetting test database..."

    # Clear all data in dependency order
    clear_all_data!

    # Reset auto-increment sequences
    reset_sequences!

    puts "✅ Database reset complete"
  end

  def setup_test_data!
    ensure_test_environment!

    puts "🌱 Setting up comprehensive test data..."

    # Load either fixtures or seeds based on preference
    if use_fixtures?
      load_fixtures!
    else
      load_test_seeds!
    end

    puts "✅ Test data setup complete"
  end

  def clear_all_data!
    ensure_test_environment!

    # Use transaction and disable foreign key checks temporarily for reliable cleanup
    ActiveRecord::Base.transaction do
      # Disable foreign key checks for PostgreSQL
      if ActiveRecord::Base.connection.adapter_name.downcase.include?("postgresql")
        ActiveRecord::Base.connection.execute("SET session_replication_role = replica;")
      end

      # Order matters for foreign key constraints - delete dependent records first
      models_in_dependency_order = [
        ActivityLog,      # References tasks, jobs, users
        Task,            # References jobs, users (parent tasks handled by self-reference)
        JobAssignment,   # References jobs, users
        JobPerson,       # References jobs, people
        Note,            # May reference jobs, tasks
        Job,             # References clients, users
        ContactMethod,   # References people
        Person,          # References clients
        Device,          # References clients
        Client,          # References users
        RefreshToken,    # References users
        User             # Base table
      ]

      models_in_dependency_order.each do |model|
        begin
          model.delete_all
          puts "  ✅ Cleared #{model.name.pluralize}" if debug_mode?
        rescue => e
          puts "  ⚠️  Error clearing #{model.name}: #{e.message}" if debug_mode?
          # Continue with other models
        end
      end

      # Re-enable foreign key checks
      if ActiveRecord::Base.connection.adapter_name.downcase.include?("postgresql")
        ActiveRecord::Base.connection.execute("SET session_replication_role = DEFAULT;")
      end
    end
  rescue => e
    puts "🚨 Error during data cleanup: #{e.message}"
    # Fallback: try to clear tables individually with foreign key checks disabled
    clear_all_data_fallback!
  end

  def clear_all_data_fallback!
    ensure_test_environment!

    puts "🔄 Using fallback cleanup method..."

    # Try truncating tables directly (PostgreSQL specific)
    if ActiveRecord::Base.connection.adapter_name.downcase.include?("postgresql")
      table_names = %w[
        activity_logs tasks job_assignments job_people notes jobs
        contact_methods people devices clients refresh_tokens users
      ]

      table_names.each do |table|
        begin
          ActiveRecord::Base.connection.execute("TRUNCATE TABLE #{table} RESTART IDENTITY CASCADE;")
          puts "  ✅ Truncated #{table}" if debug_mode?
        rescue => e
          puts "  ⚠️  Could not truncate #{table}: #{e.message}" if debug_mode?
        end
      end
    else
      # For other databases, try delete_all without foreign key checks
      [ ActivityLog, Task, JobAssignment, JobPerson, Note, Job,
       ContactMethod, Person, Device, Client, RefreshToken, User ].each do |model|
        begin
          model.delete_all
        rescue => e
          puts "  ⚠️  Could not clear #{model.name}: #{e.message}" if debug_mode?
        end
      end
    end
  end

  def reset_sequences!
    models = [ User, Client, Job, Task, Device, Person, ActivityLog, JobAssignment ]

    models.each do |model|
      ActiveRecord::Base.connection.reset_pk_sequence!(model.table_name)
    end
  end

  def verify_test_data!
    ensure_test_environment!

    requirements = {
      User => { min: 3, description: "test users" },
      Client => { min: 3, description: "test clients" },
      Job => { min: 3, description: "test jobs" },
      Task => { min: 10, description: "test tasks" },
      Device => { min: 2, description: "test devices" }
    }

    all_valid = true

    requirements.each do |model, req|
      count = model.count
      if count >= req[:min]
        puts "  ✅ #{count} #{req[:description]}"
      else
        puts "  ❌ Only #{count} #{req[:description]} (need #{req[:min]})"
        all_valid = false
      end
    end

    unless all_valid
      raise "Test data verification failed! Run TestEnvironment.setup_test_data!"
    end

    puts "🎉 Test data verification passed!"
  end

  # =============================================
  # Test Data Utilities
  # =============================================

  def use_fixtures?
    # Use fixtures if SKIP_FIXTURES is not set
    ENV["SKIP_FIXTURES"] != "true"
  end

  def load_fixtures!
    puts "📦 Loading fixture data..."

    # Temporarily enable fixtures
    fixtures_enabled = ENV["SKIP_FIXTURES"]
    ENV["SKIP_FIXTURES"] = nil

    # Load fixtures for key models
    ActiveRecord::FixtureSet.create_fixtures(
      Rails.root.join("test/fixtures"),
      %w[users clients jobs tasks devices people]
    )

    # Restore fixture setting
    ENV["SKIP_FIXTURES"] = fixtures_enabled

    puts "✅ Fixtures loaded"
  end

  def load_test_seeds!
    puts "🌱 Loading comprehensive seed data..."

    seed_file = Rails.root.join("db", "test_seeds.rb")

    if File.exist?(seed_file)
      load seed_file
    else
      puts "⚠️  Seed file not found, using basic test data"
      create_basic_test_data!
    end
  end

  def create_basic_test_data!
    # Minimal test data if seeds aren't available
    admin = User.find_or_create_by(email: "admin@test.local") do |u|
      u.name = "Test Admin"
      u.password = "password123"
      u.role = "admin"
    end

    client = Client.find_or_create_by(code: "TEST") do |c|
      c.name = "Test Client"
      c.status = "active"
    end

    job = Job.find_or_create_by(title: "Test Job") do |j|
      j.client = client
      j.created_by = admin
      j.status = "active"
    end

    3.times do |i|
      Task.find_or_create_by(title: "Test Task #{i + 1}", job: job) do |t|
        t.status = "new_task"
        t.position = (i + 1) * 10
      end
    end

    puts "✅ Basic test data created"
  end

  # =============================================
  # Test User Management
  # =============================================

  def get_test_user(role = :admin)
    case role.to_sym
    when :owner
      find_test_user("owner@bos-test.local") ||
      User.find_by(role: "owner") ||
      User.first
    when :admin
      find_test_user("admin@bos-test.local") ||
      User.find_by(role: "admin") ||
      User.first
    when :tech_lead, :technician_lead
      find_test_user("techlead@bos-test.local") ||
      User.find_by(role: "technician") ||
      User.find_by(role: "admin")
    when :technician, :tech
      find_test_user("tech@bos-test.local") ||
      User.find_by(role: "technician") ||
      User.find_by(role: "admin")
    else
      User.first
    end
  end

  def find_test_user(email)
    User.find_by(email: email)
  end

  def test_credentials(role = :admin)
    user = get_test_user(role)
    return nil unless user

    {
      email: user.email,
      password: user.email.include?("bos-test.local") ? "password123" : "password123"
    }
  end

  # =============================================
  # Test Jobs & Tasks
  # =============================================

  def get_test_job(type = :simple)
    case type.to_sym
    when :simple
      Job.find_by(title: "Simple Website Setup") ||
      Job.joins(:tasks).where(tasks: { id: Task.select(:id) }).first ||
      Job.first
    when :complex, :hierarchical
      Job.find_by(title: "Enterprise Software Deployment") ||
      Job.joins(:tasks).group("jobs.id").having("COUNT(tasks.id) > 5").first ||
      Job.first
    when :mixed_status
      Job.find_by(title: "Mobile App Development") ||
      Job.joins(:tasks).merge(Task.where(status: [ "in_progress", "paused", "failed" ])).first ||
      Job.first
    when :drag_drop, :large
      Job.find_by(title: "System Migration Project") ||
      Job.joins(:tasks).group("jobs.id").having("COUNT(tasks.id) > 10").first ||
      Job.first
    when :empty
      Job.find_by(title: "Empty Project Template") ||
      Job.left_joins(:tasks).where(tasks: { id: nil }).first ||
      Job.create!(
        title: "Empty Test Job",
        client: Client.first || create_basic_test_data!,
        created_by: get_test_user(:admin),
        status: "active"
      )
    else
      Job.first
    end
  end

  def get_hierarchical_tasks(job = nil)
    job ||= get_test_job(:complex)
    return [] unless job

    # Return tasks with parent-child relationships
    job.tasks.includes(:subtasks).where(parent_id: nil)
  end

  def get_task_with_subtasks(job = nil)
    job ||= get_test_job(:complex)
    return nil unless job

    job.tasks.joins(:subtasks).first
  end

  # =============================================
  # Browser & Server Management
  # =============================================

  def server_running?
    # Check if the test server is accessible
    begin
      require "net/http"
      uri = URI("http://localhost:#{test_server_port}")
      Net::HTTP.get_response(uri).code.to_i < 500
    rescue
      false
    end
  end

  def test_server_port
    # Default Capybara port or fallback
    if defined?(Capybara) && Capybara.current_session&.server&.port
      Capybara.current_session.server.port
    else
      9887  # Default test port
    end
  end

  def test_server_url
    "http://localhost:#{test_server_port}"
  end

  def browser_options
    options = {
      headless: headless_mode?,
      viewport: { width: 1400, height: 900 },
      ignoreHTTPSErrors: true,
      slowMo: debug_mode? ? 100 : 0
    }

    if ci_environment?
      options[:args] = [ "--no-sandbox", "--disable-setuid-sandbox" ]
    end

    options
  end

  # =============================================
  # Debugging & Utilities
  # =============================================

  def take_debug_screenshot(page, name = nil)
    return unless debug_mode?

    name ||= "debug_#{Time.now.to_i}"
    screenshot_dir = Rails.root.join("tmp", "screenshots")
    FileUtils.mkdir_p(screenshot_dir)

    path = screenshot_dir.join("#{name}.png")
    page.screenshot(path: path.to_s) if page.respond_to?(:screenshot)

    puts "📸 Debug screenshot: #{path}"
    path
  end

  def pause_for_debug
    return unless debug_mode?

    puts "\n⏸️  DEBUG MODE: Test paused"
    puts "   Press Enter to continue..."
    gets
  end

  def log_test_info(message)
    timestamp = Time.current.strftime("%H:%M:%S.%L")
    puts "[#{timestamp}] 🧪 #{message}"
  end

  def print_environment_status
    puts "\n" + "=" * 60
    puts "🧪 TEST ENVIRONMENT STATUS"
    puts "=" * 60
    puts "Rails Environment: #{Rails.env}"
    puts "Debug Mode: #{debug_mode?}"
    puts "Headless Mode: #{headless_mode?}"
    puts "CI Environment: #{ci_environment?}"
    puts "Server Running: #{server_running?}"
    puts "Server URL: #{test_server_url}"
    puts "Database: #{ActiveRecord::Base.connection.current_database}"

    if test_environment?
      puts "\n📊 Test Data Counts:"
      [ User, Client, Job, Task, Device ].each do |model|
        puts "  #{model.name}: #{model.count}"
      end

      if User.exists?
        puts "\n🔑 Available Test Users:"
        User.limit(5).each do |user|
          puts "  #{user.role.capitalize}: #{user.email}"
        end
      end
    end

    puts "=" * 60
  end

  # =============================================
  # Test Lifecycle Hooks
  # =============================================

  def before_suite
    ensure_test_environment!

    # Print environment info in debug mode
    print_environment_status if debug_mode?

    # Ensure we have test data
    if User.count < 3 || Job.count < 3
      setup_test_data!
    end
  end

  def before_test
    # Quick data verification
    unless User.exists? && Job.exists?
      setup_test_data!
    end
  end

  def after_test
    # Clean up any test artifacts in debug mode
    if debug_mode?
      # Keep screenshots for debugging
    else
      # Clean up temp files
      screenshot_dir = Rails.root.join("tmp", "screenshots")
      FileUtils.rm_rf(screenshot_dir) if screenshot_dir.exist?
    end
  end

  def after_suite
    log_test_info("Test suite completed")
  end
end

# Auto-setup for test environment
if Rails.env.test? && defined?(Rails::Console)
  TestEnvironment.print_environment_status
end
