# Testing Guide

This guide covers how to run and work with tests in the BOS project, with a focus on our comprehensive TaskList testing framework.

## Prerequisites

Before running tests, ensure you have:

1. **Test database setup**:
   ```bash
   RAILS_ENV=test rake test:db:setup
   ```

2. **Playwright installed** (for frontend tests):
   ```bash
   # If not already installed
   npm install playwright
   npx playwright install
   ```

3. **Test environment verified**:
   ```bash
   RAILS_ENV=test rake test:db:verify
   ```

## Quick Start

### **✅ WORKING**: Test Infrastructure Setup

```bash
# 1. Setup test database with comprehensive seed data
RAILS_ENV=test rails db:test:seed

# 2. Verify test data is loaded correctly
RAILS_ENV=test rails runner "puts 'Users: ' + User.count.to_s; puts 'Jobs: ' + Job.count.to_s; puts 'Tasks: ' + Task.count.to_s"

# 3. Start Rails server in test mode (required for Playwright)
RAILS_ENV=test rails server -b 0.0.0.0

# 4. In a separate terminal, run Playwright tests
npx playwright test
```

### Current Status
✅ **Infrastructure Complete**: Test database seeding, fixture alignment, and Playwright setup working  
✅ **Test Data**: 5 test users, 6 clients, 5 jobs, 60+ tasks with comprehensive scenarios  
✅ **Foreign Key Issues Resolved**: All database constraint errors fixed with proper cleanup ordering  
✅ **Test Environment Management**: Robust cleanup and seeding with PostgreSQL support  
⚠️ **Application Error**: Sessions controller missing `Views::Sessions::NewView` class (500 error)  

**Result**: Test infrastructure is complete and working. Application-level Views module needs to be addressed for browser testing.

## TaskList Testing Framework

Our TaskList component has a comprehensive testing framework with multiple test suites:

### Test Suites

#### 1. Comprehensive Tests
**Purpose**: Complete functional testing of all TaskList features

```bash
RAILS_ENV=test rake test:tasklist:comprehensive
```

**What it tests**:
- Task creation, editing, deletion
- Status management (all status transitions)
- Drag & drop functionality
- Multi-select operations
- Keyboard navigation
- Filtering and search
- Error handling

#### 2. Focused Feature Tests
**Purpose**: Deep testing of specific features and edge cases

```bash
rake test:tasklist:focused
```

**What it tests**:
- Special characters in task titles
- Rapid task creation
- Complex drag & drop scenarios
- Keyboard shortcuts
- Performance under stress
- Error recovery

#### 3. Regression Tests
**Purpose**: Protect critical functionality during refactoring

```bash
rake test:tasklist:regression
```

**What it tests**:
- Core functionality preservation
- Data persistence
- UI stability
- Integration with different user roles

### Test Execution Options

#### Debug Mode (Visual Browser)
```bash
# Run tests with visible browser for debugging
rake test:tasklist:debug

# Or manually set environment variables
DEBUG=true PLAYWRIGHT_HEADFUL=true rake test:tasklist:comprehensive
```

#### CI Mode (Headless)
```bash
# Optimized for continuous integration
rake test:tasklist:ci
```

#### Specific Tests
```bash
# Run specific test file
rake test:tasklist:specific[tasklist_comprehensive_test]

# Run specific test method
rake test:tasklist:specific[tasklist_comprehensive_test,task_creation]

# Traditional Rails way
rails test test/playwright/tasklist_comprehensive_test.rb -n test_loads_task_list_and_displays_tasks_correctly
```

## Traditional Rails Tests

### Model Tests
```bash
# Run all model tests
rails test test/models/

# Specific model
rails test test/models/task_test.rb
rails test test/models/job_test.rb
```

### Controller Tests
```bash
# Run all controller tests
rails test test/controllers/

# Specific controller
rails test test/controllers/tasks_controller_test.rb
```

### Integration Tests
```bash
# Run all integration tests
rails test test/integration/
```

## Test Database Management

### Setup and Seeding
```bash
# Full setup (creates schema, seeds data)
rake test:db:setup
# OR: rake db:test:seed

# Quick setup (faster, assumes schema exists)
rake db:test:quick_setup

# Reset everything
rake test:db:reset
# OR: rake db:test:reset

# Just add seed data
rake db:test:seed
```

### Verification
```bash
# Verify test data exists
rake test:db:verify
# OR: rake db:test:verify

# Check database status
rake db:test:status
```

## Test Data

### Available Test Scenarios

The framework provides predefined test data scenarios:

- **`:simple`** - Basic jobs with few tasks
- **`:complex`** - Jobs with hierarchical task structures  
- **`:mixed_status`** - Jobs with tasks in various statuses
- **`:large`** - Jobs with many tasks (performance testing)
- **`:empty`** - Jobs with no tasks (creation testing)

### Test Users

Available test user roles:
- **`:admin`** - Full permissions
- **`:owner`** - Business owner permissions
- **`:technician`** - Technical staff permissions
- **`:tech_lead`** - Lead technician permissions

## Debugging Tests

### Visual Debugging
```bash
# Run with visible browser
DEBUG=true PLAYWRIGHT_HEADFUL=true rake test:tasklist:comprehensive
```

### Screenshots
Tests automatically capture screenshots in debug mode:
- Saved to `tmp/screenshots/`
- Timestamped for easy identification
- Available in failed test runs

### Console Output
```bash
# Verbose test output
DEBUG=true rake test:tasklist:comprehensive
```

### Pausing Tests
In debug mode, tests can be paused for manual inspection:
```ruby
# This will pause in debug mode for manual browser inspection
TestEnvironment.pause_for_debug
```

## Writing New Tests

### Using the TaskList Page Object
```ruby
class MyTaskListTest < ApplicationPlaywrightTestCase
  setup do
    TestEnvironment.setup_test_data!
    @task_list = TaskListPage.new(@page)
    login_as_test_user(:admin)
  end

  test "my custom functionality" do
    # Navigate to a test job
    job = TestEnvironment.get_test_job(:simple)
    @task_list.visit_job(job)
    
    # Use high-level page object methods
    @task_list.create_task("My Test Task")
    @task_list.change_task_status(0, "in_progress")
    
    # Make assertions
    assert @task_list.has_task?("My Test Task")
    assert_equal "in_progress", @task_list.get_task_status(0)
  end
end
```

### Using Test Helpers
```ruby
test "using helpers directly" do
  navigate_to_job(:simple)
  create_new_task("Helper Test Task")
  change_task_status(0, "successfully_completed")
  
  assert_task_exists("Helper Test Task")
  assert_task_has_status(0, "successfully_completed")
end
```

## Test Organization

### File Structure
```
test/
├── fixtures/           # Test data fixtures
├── models/            # Model unit tests
├── controllers/       # Controller tests
├── integration/       # Integration tests
├── playwright/        # Frontend E2E tests
│   ├── tasklist_comprehensive_test.rb
│   ├── tasklist_focused_tests.rb
│   └── tasklist_regression_test.rb
├── support/           # Test helpers and utilities
│   ├── tasklist_test_helpers.rb
│   └── page_objects/
│       └── task_list_page.rb
├── test_helper.rb     # Main test configuration
└── test_environment.rb # Test environment management
```

### Test Naming Conventions
- Test files: `*_test.rb`
- Test methods: `test "descriptive name"`
- Page objects: `*_page.rb`
- Helpers: `*_helpers.rb`

## Continuous Integration

### Running Tests in CI
```bash
# Headless mode for CI environments
CI=true rake test:tasklist:ci

# Traditional Rails tests
RAILS_ENV=test rails test
```

### GitHub Actions Example
```yaml
- name: Setup Test Database
  run: rake test_db:setup

- name: Run TaskList Tests
  run: CI=true rake test:tasklist:ci
  env:
    RAILS_ENV: test

- name: Run Unit Tests  
  run: rails test
  env:
    RAILS_ENV: test
```

## Performance Considerations

### Parallel Testing
```bash
# Control parallel workers (default uses all CPU cores)
PARALLEL_WORKERS=2 rails test

# TaskList tests run with reduced parallelization for stability
rake test:tasklist:all
```

### Test Speed
- **Smoke test**: ~30 seconds (quick verification)
- **Comprehensive**: ~5-10 minutes (full functionality)
- **All TaskList tests**: ~10-15 minutes (complete suite)

## Troubleshooting

### Common Issues

#### Test Database Problems
```bash
# Reset and try again
rake test:db:reset
rake test:db:verify
```

#### Browser/Playwright Issues
```bash
# Reinstall Playwright
npx playwright install

# Check browser availability
DEBUG=true rake test:tasklist:smoke
```

#### Test Data Issues
```bash
# Verify test data exists
rake test:db:verify

# Recreate test data
rake db:test:seed
```

#### Flaky Tests
```bash
# Run with debug mode to see what's happening
DEBUG=true PLAYWRIGHT_HEADFUL=true rake test:tasklist:specific[test_name]

# Check for timing issues - increase timeouts if needed
```

### Debug Commands
```bash
# Environment status
rake db:test:status

# Clean and start fresh
rake test:tasklist:clean
rake test:db:setup

# Verbose output
DEBUG=true rake test:tasklist:smoke
```

## Maintenance

### Cleaning Test Artifacts
```bash
# Clean screenshots, logs, and temp files
rake test:tasklist:clean
```

### Updating Test Data
```bash
# Modify db/test_seeds.rb then:
rake test:db:reset
```

### Test Reports
```bash
# Generate test coverage and status report
rake test:tasklist:report
```

## Best Practices

### Before Committing
```bash
# Always run regression tests before major changes
rake test:tasklist:regression

# Run relevant tests for your changes
rake test:tasklist:focused  # for feature changes
rails test test/models/     # for model changes
```

### When Refactoring
```bash
# 1. Run comprehensive tests before changes
rake test:tasklist:comprehensive

# 2. Make your changes

# 3. Run regression tests to verify nothing broke
rake test:tasklist:regression

# 4. Run full suite to be sure
rake test:tasklist:all
```

### For New Features
```bash
# 1. Write tests first
# 2. Run them to see them fail
# 3. Implement the feature
# 4. Run tests to see them pass
rake test:tasklist:comprehensive
```

## Help and Reference

### Available Commands
```bash
# Show all TaskList test commands
rake test:tasklist:help

# Show all test-related rake tasks
rake -T test
```

### Getting Help
```bash
# Comprehensive testing documentation
cat README_TASKLIST_TESTING.md

# Test framework code
ls test/support/
```

## Summary

This testing framework provides:
- ✅ **Comprehensive coverage** of TaskList functionality
- ✅ **Multiple test suites** for different purposes
- ✅ **Debug-friendly** tools and visual modes
- ✅ **CI/CD ready** configuration
- ✅ **Easy-to-use** rake commands
- ✅ **Maintainable** Page Object Model pattern

Start with `rake test:tasklist:smoke` to verify everything works, then use `rake test:tasklist:all` for full testing coverage.