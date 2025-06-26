require "open3"
require "tempfile"

class ProcessFeatureStoryJob < ApplicationJob
  queue_as :default

  def perform(issue_number, action)
    Rails.logger.info "ProcessFeatureStoryJob: Processing issue ##{issue_number} with action: #{action}"

    case action
    when "generate_story"
      generate_story(issue_number)
    when "approve_implementation"
      approve_implementation(issue_number)
    else
      Rails.logger.error "ProcessFeatureStoryJob: Unknown action: #{action}"
    end
  rescue StandardError => e
    Rails.logger.error "ProcessFeatureStoryJob: Error processing issue ##{issue_number}: #{e.message}"
    Rails.logger.error e.backtrace.join("\n")
    raise e
  end

  private

  def generate_story(issue_number)
    # Fetch issue details
    github_client = github_client()
    issue = github_client.issue(github_repo, issue_number)

    # Check if story already generated
    if issue.labels.any? { |l| l.name == "story-generated" }
      Rails.logger.info "Story already generated for issue ##{issue_number}"
      return
    end

    # Generate story using Claude
    prompt = generate_story_prompt(issue)
    story = execute_claude_for_story(prompt, issue_number)

    # Add story as comment
    github_client.add_comment(github_repo, issue_number, format_story_comment(story))

    # Add label
    github_client.add_labels_to_an_issue(github_repo, issue_number, [ "story-generated" ])

    # Send notification email
    NotificationMailer.story_generated(issue_number, issue.title).deliver_later if email_notifications_enabled?
  end

  def approve_implementation(issue_number)
    github_client = github_client()
    issue = github_client.issue(github_repo, issue_number)

    # Check if story was generated
    unless issue.labels.any? { |l| l.name == "story-generated" }
      github_client.add_comment(
        github_repo,
        issue_number,
        "⚠️ Cannot approve implementation: Story must be generated first. Use `/generate-story` command."
      )
      return
    end

    # Add processing label
    github_client.add_labels_to_an_issue(github_repo, issue_number, [ "claude-implementing" ])

    # Generate implementation prompt
    prompt = generate_implementation_prompt(issue)

    # Execute Claude for implementation
    result = execute_claude_for_implementation(prompt, issue_number)

    # Update labels
    github_client.remove_label(github_repo, issue_number, "claude-implementing") rescue nil
    github_client.add_labels_to_an_issue(github_repo, issue_number, [ "implementation-pr-created" ])

    # Add comment
    github_client.add_comment(
      github_repo,
      issue_number,
      "✅ Implementation has been initiated. Claude is working on the feature and will create a PR shortly."
    )

    # Send notification
    NotificationMailer.implementation_started(issue_number, issue.title).deliver_later if email_notifications_enabled?
  rescue => e
    # Remove processing label on error
    github_client.remove_label(github_repo, issue_number, "claude-implementing") rescue nil
    github_client.add_labels_to_an_issue(github_repo, issue_number, [ "automation-failed" ]) rescue nil

    # Add error comment
    github_client.add_comment(
      github_repo,
      issue_number,
      "❌ Implementation failed: #{e.message}"
    ) rescue nil

    raise e
  end

  def generate_story_prompt(issue)
    <<~PROMPT
      You are a BMAD Story Manager agent. Generate a detailed user story for the following feature request.

      FEATURE REQUEST DETAILS:
      Title: #{issue.title}
      Body: #{issue.body}
      Issue #: #{issue.number}

      Generate a comprehensive user story following BMAD methodology:

      1. USER STORY FORMAT:
         - Title: Clear, concise feature title
         - As a [role], I want [feature] so that [benefit]
         - Include multiple user stories if needed for different roles

      2. ACCEPTANCE CRITERIA:
         - List specific, testable criteria
         - Include happy path and edge cases
         - Define clear success metrics
         - Consider error handling

      3. TECHNICAL CONSIDERATIONS:
         - Architecture decisions needed
         - Database changes required
         - API modifications
         - UI/UX considerations
         - Performance implications

      4. IMPLEMENTATION NOTES:
         - Suggested approach
         - Potential challenges
         - Dependencies on other features
         - Testing strategy

      5. EFFORT ESTIMATE:
         - Story points or hours
         - Breakdown by component if complex

      Format the response as markdown suitable for a GitHub comment.
      Focus on clarity and completeness for developers who will implement this.
    PROMPT
  end

  def generate_implementation_prompt(issue)
    # Get the story from comments
    comments = github_client.issue_comments(github_repo, issue.number)
    story_comment = comments.find { |c| c.body.include?("USER STORY FORMAT") }

    <<~PROMPT
      You are Claude Code with BMAD Dev agent capabilities.
      Implement the feature request described in GitHub Issue ##{issue.number}.

      ISSUE DETAILS:
      Title: #{issue.title}
      Original Request: #{issue.body}

      BMAD STORY:
      #{story_comment&.body || "No story found - analyze the original request"}

      IMPLEMENTATION INSTRUCTIONS:

      1. ANALYZE the requirements thoroughly
      2. CREATE the implementation following Rails best practices
      3. ENSURE the code follows the existing patterns in the codebase
      4. ADD comprehensive tests (check existing test patterns)
      5. CREATE meaningful commits with clear messages

      GIT WORKFLOW:
      - Create branch: feature/issue-#{issue.number}
      - Make atomic commits for each logical change
      - Final commit: "Implement: #{issue.title}\n\nCloses ##{issue.number}"

      CREATE PR:
      - Title: "Feature: #{issue.title}"
      - Body must include "Closes ##{issue.number}"
      - List all changes made
      - Include testing instructions
      - Note any migration requirements

      IMPORTANT: Start by checking out a new branch called feature/issue-#{issue.number}
    PROMPT
  end

  def execute_claude_for_story(prompt, issue_number)
    # Create temporary file for prompt
    temp_file = Tempfile.new([ "claude_story", ".txt" ])
    temp_file.write(prompt)
    temp_file.close

    # Execute Claude CLI
    conversation_id = "story-#{issue_number}"
    command = "claude --conversation-id #{conversation_id} < #{temp_file.path}"

    Rails.logger.info "Executing Claude for story generation on issue ##{issue_number}"

    output = nil
    error = nil
    status = nil

    Open3.popen3(command) do |stdin, stdout, stderr, wait_thr|
      output = stdout.read
      error = stderr.read
      status = wait_thr.value
    end

    if status.exitstatus != 0
      raise "Claude CLI failed: #{error}"
    end

    output
  ensure
    temp_file&.unlink
  end

  def execute_claude_for_implementation(prompt, issue_number)
    # Similar to story generation but with different conversation ID
    temp_file = Tempfile.new([ "claude_impl", ".txt" ])
    temp_file.write(prompt)
    temp_file.close

    conversation_id = "impl-#{issue_number}"
    command = "claude --conversation-id #{conversation_id} < #{temp_file.path}"

    Rails.logger.info "Executing Claude for implementation on issue ##{issue_number}"

    output = nil
    error = nil
    status = nil

    Open3.popen3(command) do |stdin, stdout, stderr, wait_thr|
      output = stdout.read
      error = stderr.read
      status = wait_thr.value
    end

    if status.exitstatus != 0
      raise "Claude CLI failed: #{error}"
    end

    output
  ensure
    temp_file&.unlink
  end

  def format_story_comment(story)
    <<~COMMENT
      ## 📋 BMAD User Story Generated

      #{story}

      ---

      ### 🎯 Next Steps:
      - Review the story above
      - Use `/approve-implementation` to start implementation
      - Use `/decline [reason]` to close this request

      *Generated by Claude BMAD Story Manager*
    COMMENT
  end

  def github_client
    @github_client ||= Octokit::Client.new(
      access_token: Rails.application.credentials.dig(:github_token) || ENV["GITHUB_TOKEN"]
    )
  end

  def github_repo
    Rails.application.credentials.dig(:github_repo) || ENV["GITHUB_REPO"] || "fluffyx/bos"
  end

  def email_notifications_enabled?
    ENV["FEATURE_EMAIL_NOTIFICATIONS"] != "false"
  end
end
