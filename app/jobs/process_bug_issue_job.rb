class ProcessBugIssueJob < ApplicationJob
  queue_as :default

  def perform(issue_number)
    Rails.logger.info "ProcessBugIssueJob: Starting to process issue ##{issue_number}"

    # Check if automation is enabled
    unless automation_enabled?
      Rails.logger.info "Bug automation is disabled. Skipping issue ##{issue_number}"
      return
    end

    # Process the bug issue with Claude
    ClaudeAutomationService.process_bug_issue(issue_number)

    Rails.logger.info "ProcessBugIssueJob: Successfully processed issue ##{issue_number}"
  rescue ClaudeAutomationService::ClaudeExecutionError => e
    Rails.logger.error "ProcessBugIssueJob: Failed to process issue ##{issue_number}: #{e.message}"
    # Don't retry Claude execution errors - they need manual intervention
    raise e
  rescue StandardError => e
    Rails.logger.error "ProcessBugIssueJob: Unexpected error for issue ##{issue_number}: #{e.message}"
    Rails.logger.error e.backtrace.join("\n")
    # Retry other errors (network issues, etc.)
    raise e
  end

  private

  def automation_enabled?
    # Emergency off switch via environment variable
    ENV["BUG_AUTOMATION_ENABLED"] != "false"
  end
end
