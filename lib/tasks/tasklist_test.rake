# TaskList Test Management Rake Tasks
# Provides convenient commands for running TaskList-specific tests

namespace :test do
  namespace :tasklist do
    desc "Run all TaskList Playwright tests"
    task all: :environment do
      puts "🧪 Running all TaskList Playwright tests..."

      # Ensure test environment is ready
      Rake::Task["db:test:quick_setup"].invoke

      # Run all TaskList tests
      test_files = [
        "test/playwright/tasklist_comprehensive_test.rb",
        "test/playwright/tasklist_focused_tests.rb",
        "test/playwright/tasklist_regression_test.rb"
      ]

      success = true

      test_files.each do |file|
        if File.exist?(Rails.root.join(file))
          puts "\\n📂 Running #{file}..."
          result = system("rails test #{file}")
          success &&= result
        else
          puts "⚠️  Test file not found: #{file}"
        end
      end

      if success
        puts "\\n✅ All TaskList tests passed!"
      else
        puts "\\n❌ Some TaskList tests failed!"
        exit 1
      end
    end

    desc "Run comprehensive TaskList functionality tests"
    task comprehensive: :environment do
      puts "🧪 Running comprehensive TaskList tests..."
      Rake::Task["db:test:quick_setup"].invoke

      system("rails test test/playwright/tasklist_comprehensive_test.rb")
    end

    desc "Run focused TaskList feature tests"
    task focused: :environment do
      puts "🧪 Running focused TaskList feature tests..."
      Rake::Task["db:test:quick_setup"].invoke

      system("rails test test/playwright/tasklist_focused_tests.rb")
    end

    desc "Run TaskList regression tests"
    task regression: :environment do
      puts "🧪 Running TaskList regression tests..."
      Rake::Task["db:test:quick_setup"].invoke

      system("rails test test/playwright/tasklist_regression_test.rb")
    end

    desc "Run TaskList tests with debug mode"
    task debug: :environment do
      puts "🧪 Running TaskList tests in debug mode..."
      Rake::Task["db:test:quick_setup"].invoke

      ENV["DEBUG"] = "true"
      ENV["PLAYWRIGHT_HEADFUL"] = "true"

      Rake::Task["test:tasklist:comprehensive"].invoke
    end

    desc "Run TaskList tests in headless mode (CI)"
    task ci: :environment do
      puts "🧪 Running TaskList tests for CI..."

      ENV["CI"] = "true"
      ENV["PLAYWRIGHT_HEADFUL"] = "false"
      ENV["DEBUG"] = "false"

      Rake::Task["test:tasklist:all"].invoke
    end

    desc "Run a specific TaskList test method"
    task :specific, [ :test_file, :test_method ] => :environment do |t, args|
      test_file = args[:test_file] || "tasklist_comprehensive_test"
      test_method = args[:test_method]

      puts "🧪 Running specific test: #{test_file}#{test_method ? "##{test_method}" : ""}..."
      Rake::Task["db:test:quick_setup"].invoke

      file_path = "test/playwright/#{test_file}.rb"
      unless file_path.include?("test/playwright/")
        file_path = "test/playwright/#{test_file}_test.rb"
      end

      command = "rails test #{file_path}"
      command += " -n test_#{test_method}" if test_method

      system(command)
    end

    desc "Setup test environment and run quick smoke test"
    task smoke: :environment do
      puts "🧪 Running TaskList smoke test..."

      # Quick environment verification
      Rake::Task["db:test:verify"].invoke

      # Run a minimal verification to check if everything is set up correctly
      puts "\\n🔥 Smoke test: Basic functionality check..."

      begin
        # Verify test data exists
        simple_job = Job.find_by(title: "Simple Website Setup")
        raise "Simple job not found" unless simple_job

        puts "  ✅ Test jobs exist"

        # Verify tasks exist
        task_count = simple_job.tasks.count
        raise "No tasks found" if task_count == 0

        puts "  ✅ Tasks exist (#{task_count} tasks)"

        # Verify test users exist
        admin_user = User.find_by(email: "admin@bos-test.local")
        raise "Admin user not found" unless admin_user

        puts "  ✅ Test users exist"

        # Verify task statuses
        statuses = Task.distinct.pluck(:status)
        puts "  ✅ Task statuses available: #{statuses.join(', ')}"

        # Check for hierarchical tasks
        parent_tasks = Task.joins(:subtasks).distinct.count
        puts "  ✅ Hierarchical tasks: #{parent_tasks} parent tasks"

        puts "\\n🎉 TaskList smoke test completed successfully!"
        puts "\\n🚀 Ready for full TaskList testing!"
        puts "\\nNext steps:"
        puts "  1. Install Playwright for browser testing:"
        puts "     npm install playwright"
        puts "     npx playwright install"
        puts "  2. Run comprehensive tests:"
        puts "     rake test:tasklist:all"

      rescue => e
        puts "\\n❌ Smoke test failed: #{e.message}"
        puts "\\nTry running: RAILS_ENV=test rake db:test:reset"
        exit 1
      end
    end

    desc "Clean up test artifacts and reset test environment"
    task clean: :environment do
      puts "🧹 Cleaning TaskList test environment..."

      # Clean screenshots
      screenshot_dir = Rails.root.join("tmp", "screenshots")
      if screenshot_dir.exist?
        FileUtils.rm_rf(screenshot_dir)
        puts "  ✅ Cleaned screenshots"
      end

      # Reset test database
      Rake::Task["db:test:reset"].invoke
      puts "  ✅ Reset test database"

      # Clear test logs
      test_log = Rails.root.join("log", "test.log")
      if test_log.exist?
        File.truncate(test_log, 0)
        puts "  ✅ Cleared test logs"
      end

      puts "\\n🎉 TaskList test environment cleaned!"
    end

    desc "Generate test report for TaskList functionality"
    task report: :environment do
      puts "📊 Generating TaskList test report..."

      # This is a placeholder for future test reporting functionality
      # Could integrate with test coverage tools, generate HTML reports, etc.

      report_data = {
        timestamp: Time.current,
        test_files: Dir[Rails.root.join("test/playwright/tasklist_*.rb")].map(&:basename),
        test_data_status: TestEnvironment.verify_test_data!,
        environment: {
          rails_env: Rails.env,
          ruby_version: RUBY_VERSION,
          rails_version: Rails::VERSION::STRING
        }
      }

      puts "\\n📋 TaskList Test Report"
      puts "=" * 50
      puts "Generated: #{report_data[:timestamp]}"
      puts "Test Files: #{report_data[:test_files].count}"
      report_data[:test_files].each { |file| puts "  - #{file}" }
      puts "Environment: #{report_data[:environment][:rails_env]}"
      puts "Ruby: #{report_data[:environment][:ruby_version]}"
      puts "Rails: #{report_data[:environment][:rails_version]}"
      puts "=" * 50

      # Save report to file
      report_file = Rails.root.join("tmp", "tasklist_test_report.json")
      FileUtils.mkdir_p(File.dirname(report_file))
      File.write(report_file, JSON.pretty_generate(report_data))
      puts "\\n📄 Report saved to: #{report_file}"
    end

    desc "Show TaskList test help and examples"
    task :help do
      puts <<~HELP
        📚 TaskList Test Rake Tasks

        Available tasks:

        🧪 Running Tests:
        rake test:tasklist:all           # Run all TaskList tests
        rake test:tasklist:comprehensive # Run comprehensive functionality tests
        rake test:tasklist:focused       # Run focused feature tests
        rake test:tasklist:regression    # Run regression tests
        rake test:tasklist:smoke         # Quick smoke test

        🐛 Debugging:
        rake test:tasklist:debug         # Run tests with visual browser

        🏗️  CI/CD:
        rake test:tasklist:ci            # Run tests in CI mode

        🎯 Specific Tests:
        rake test:tasklist:specific[test_file,test_method]

        Examples:
        rake test:tasklist:specific[tasklist_comprehensive_test,basic_functionality]
        rake test:tasklist:specific[tasklist_focused_tests,task_creation]

        🧹 Maintenance:
        rake test:tasklist:clean         # Clean test artifacts
        rake test:tasklist:report        # Generate test report

        🔧 Test Data:
        rake test:db:setup               # Setup test database
        rake db:test:seed                # Seed with test data
        rake test:db:verify              # Verify test data

        💡 Tips:
        - Use DEBUG=true for verbose output
        - Use PLAYWRIGHT_HEADFUL=true to see browser
        - Tests automatically setup required test data
        - Screenshots saved to tmp/screenshots/ in debug mode
      HELP
    end
  end

  # Alias for convenience
  task tasklist: "test:tasklist:all"
end

# Default task shows help
task "test:tasklist" => "test:tasklist:help"
