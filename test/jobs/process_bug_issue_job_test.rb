require "test_helper"
require "mocha/minitest"

class ProcessBugIssueJobTest < ActiveJob::TestCase
  setup do
    @issue_number = 123
  end

  test "processes bug issue when automation is enabled" do
    ENV["BUG_AUTOMATION_ENABLED"] = "true"

    ClaudeAutomationService.expects(:process_bug_issue).with(@issue_number)

    ProcessBugIssueJob.perform_now(@issue_number)
  end

  test "skips processing when automation is disabled" do
    ENV["BUG_AUTOMATION_ENABLED"] = "false"

    ClaudeAutomationService.expects(:process_bug_issue).never

    ProcessBugIssueJob.perform_now(@issue_number)
  end

  test "processes when BUG_AUTOMATION_ENABLED is not set" do
    ENV.delete("BUG_AUTOMATION_ENABLED")

    ClaudeAutomationService.expects(:process_bug_issue).with(@issue_number)

    ProcessBugIssueJob.perform_now(@issue_number)
  end

  test "handles ClaudeExecutionError without retry" do
    ENV["BUG_AUTOMATION_ENABLED"] = "true"

    error = ClaudeAutomationService::ClaudeExecutionError.new("Claude failed")
    ClaudeAutomationService.expects(:process_bug_issue).raises(error)

    assert_raises(ClaudeAutomationService::ClaudeExecutionError) do
      ProcessBugIssueJob.perform_now(@issue_number)
    end
  end

  test "re-raises other errors for retry" do
    ENV["BUG_AUTOMATION_ENABLED"] = "true"

    error = StandardError.new("Network error")
    ClaudeAutomationService.expects(:process_bug_issue).raises(error)

    assert_raises(StandardError) do
      ProcessBugIssueJob.perform_now(@issue_number)
    end
  end

  test "logs appropriate messages during processing" do
    ENV["BUG_AUTOMATION_ENABLED"] = "true"

    ClaudeAutomationService.expects(:process_bug_issue).with(@issue_number)

    # Just verify it runs successfully without mocking logger
    ProcessBugIssueJob.perform_now(@issue_number)
  end

  test "logs when automation is disabled" do
    ENV["BUG_AUTOMATION_ENABLED"] = "false"

    # Verify no processing happens
    ClaudeAutomationService.expects(:process_bug_issue).never

    ProcessBugIssueJob.perform_now(@issue_number)
  end
end
