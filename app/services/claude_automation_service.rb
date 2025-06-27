require "open3"
require "tempfile"

class ClaudeAutomationService
  class ClaudeExecutionError < StandardError; end

  def self.process_bug_issue(issue_number)
    new(issue_number).process
  end

  def initialize(issue_number)
    @issue_number = issue_number
    @github_client = Octokit::Client.new(
      access_token: Rails.application.credentials.dig(:git_token) || ENV["GIT_TOKEN"]
    )
    @github_repo = Rails.application.credentials.dig(:git_repo) || ENV["GIT_REPO"] || "fluffyx/bos"
  end

  def process
    # Fetch issue details
    issue = fetch_issue

    # Add processing label
    add_label("claude-processing")

    # Generate prompt with BMAD methodology
    prompt = generate_bug_fix_prompt(issue)

    # Execute Claude CLI
    result = execute_claude_cli(prompt)

    # Update labels on completion
    remove_label("claude-processing")
    add_label("pr-created")

    # Add comment to issue
    add_issue_comment("Claude has processed this bug report. A PR should be created shortly.")

    result
  rescue => e
    Rails.logger.error "ClaudeAutomationService Error: #{e.message}"
    Rails.logger.error e.backtrace.join("\n")

    # Remove processing label on error
    remove_label("claude-processing") rescue nil
    add_label("automation-failed") rescue nil

    # Add error comment to issue
    add_issue_comment("Automation failed: #{e.message}") rescue nil

    raise ClaudeExecutionError, "Failed to process issue ##{@issue_number}: #{e.message}"
  end

  private

  def fetch_issue
    @github_client.issue(@github_repo, @issue_number)
  end

  def add_label(label)
    @github_client.add_labels_to_an_issue(@github_repo, @issue_number, [ label ])
  end

  def remove_label(label)
    @github_client.remove_label(@github_repo, @issue_number, label)
  rescue Octokit::NotFound
    # Label might not exist, ignore
  end

  def add_issue_comment(comment)
    @github_client.add_comment(@github_repo, @issue_number, comment)
  end

  def generate_bug_fix_prompt(issue)
    # Parse console logs if present
    console_logs = extract_console_logs(issue.body)

    <<~PROMPT
      You are Claude Code with BMAD Dev agent capabilities.#{' '}
      Fix the bug reported in GitHub Issue ##{issue.number}.

      ISSUE DETAILS:
      Title: #{issue.title}
      Body: #{issue.body}
      URL: #{issue.html_url}

      BMAD METHODOLOGY INSTRUCTIONS:

      1. ANALYZE (QA Agent approach):
         - Identify the root cause from symptoms
         - Determine affected components
         - Assess impact and severity
         - Note reproduction steps from report

      2. CREATE STORY (Story Manager approach):
         - Title: Fix: #{issue.title}
         - User Story: As a user, I want this bug fixed so that [impact]
         - Acceptance Criteria:
           * Bug no longer occurs
           * Tests cover the fix
           * No regression in related features
         - Technical Notes: Document your fix approach

      3. IMPLEMENT (Dev Agent approach):
         - Follow existing code patterns in the codebase
         - Make minimal changes to fix the issue
         - Add tests if applicable (check test patterns first)
         - Ensure no side effects

      4. GIT WORKFLOW:
         - Create branch: fix/issue-#{issue.number}
         - Commit with message: "Fix: #{issue.title}\n\nFixes ##{issue.number}"
         - Include story details in commit body

      5. CREATE PR:
         - Title: "Fix: #{issue.title}"
         - Body must include "Fixes ##{issue.number}" for auto-close
         - Add BMAD story summary
         - List files changed and why
         - Note any risks or concerns

      Follow BMAD best practices throughout. The PR will automatically close the issue when merged.

      IMPORTANT: Start by checking out a new branch called fix/issue-#{issue.number}
    PROMPT
  end

  def extract_console_logs(issue_body)
    # Extract console logs from the issue body if present
    match = issue_body.match(/<details>\s*<summary>Console Logs.*?<\/summary>\s*```json\s*(.*?)\s*```\s*<\/details>/m)
    return nil unless match

    begin
      JSON.parse(match[1])
    rescue JSON::ParserError
      nil
    end
  end

  def execute_claude_cli(prompt)
    # Create a temporary file for the prompt
    temp_file = Tempfile.new([ "claude_prompt", ".txt" ])
    temp_file.write(prompt)
    temp_file.close

    # Execute Claude CLI with the prompt
    # Using conversation ID to maintain context for the issue
    conversation_id = "issue-#{@issue_number}"

    # Build the command
    # Note: We're using the prompt file to avoid shell escaping issues
    command = "claude --conversation-id #{conversation_id} < #{temp_file.path}"

    Rails.logger.info "Executing Claude CLI for issue ##{@issue_number}"
    Rails.logger.debug "Command: #{command}"

    # Execute the command
    output = nil
    error = nil
    status = nil

    Open3.popen3(command) do |stdin, stdout, stderr, wait_thr|
      output = stdout.read
      error = stderr.read
      status = wait_thr.value
    end

    # Log the result
    Rails.logger.info "Claude CLI exit status: #{status.exitstatus}"
    Rails.logger.debug "Claude CLI output: #{output[0..500]}..." if output.present?
    Rails.logger.error "Claude CLI error: #{error}" if error.present?

    # Check for errors
    if status.exitstatus != 0
      raise ClaudeExecutionError, "Claude CLI failed with exit code #{status.exitstatus}: #{error}"
    end

    output
  ensure
    temp_file&.unlink
  end
end
