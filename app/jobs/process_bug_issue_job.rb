class ProcessBugIssueJob < ApplicationJob
  queue_as :default

  def perform(issue_number)
    # This job will be implemented in Story 2.1: Claude Integration for Bug Fixes
    # For now, it's just a placeholder that logs the issue number
    Rails.logger.info "ProcessBugIssueJob: Queued for processing issue ##{issue_number}"

    # TODO: In Story 2.1, this will:
    # 1. Fetch the issue details from GitHub
    # 2. Parse the bug report data (description, console logs, screenshot)
    # 3. Invoke Claude CLI to analyze and fix the bug
    # 4. Create a PR with the fix
    # 5. Update the issue with the PR link
  end
end
