class FeedbackController < ApplicationController
  before_action :set_feedback_type
  before_action :log_env_vars, only: [ :create ]

  def new
    case @feedback_type
    when "bug"
      render Views::Feedback::BugReportView.new(current_user: current_user)
    when "feature"
      render Views::Feedback::FeatureRequestView.new(current_user: current_user)
    else
      redirect_to root_path, alert: "Invalid feedback type"
    end
  end

  def create
    case @feedback_type
    when "bug"
      create_bug_report
    when "feature"
      create_feature_request
    else
      redirect_to root_path, alert: "Invalid feedback type"
    end
  end

  private

  def set_feedback_type
    @feedback_type = params[:type]
  end

  def log_env_vars
    Rails.logger.debug "=== Environment Check at Controller Init ==="
    Rails.logger.debug "GIT_TOKEN from ENV: #{ENV['GIT_TOKEN'].present? ? 'present' : 'missing'}"
    Rails.logger.debug "GIT_REPO from ENV: #{ENV['GIT_REPO']}"
    Rails.logger.debug "All GIT_* env vars: #{ENV.select { |k, v| k.start_with?('GIT_') }.keys.join(', ')}"
  end

  def create_bug_report
    # Create issue first to get issue number
    issue = github_client.create_issue(
      github_repo,
      params[:title],
      format_bug_report_body(nil), # No screenshot URL yet
      labels: [ "bug", "auto-fix" ]
    )

    # Upload screenshot if present and update issue body
    if params[:screenshot].present?
      begin
        screenshot_url = upload_screenshot_to_repo(issue.number, params[:screenshot])

        # Update issue body with screenshot
        updated_body = format_bug_report_body(screenshot_url)
        github_client.update_issue(
          github_repo,
          issue.number,
          body: updated_body
        )
      rescue => e
        Rails.logger.error "Failed to upload screenshot: #{e.message}"
        # Continue without screenshot
      end
    end

    # Turning off; this function is abstracted to a separate ruby script on a separate server
    # ProcessBugIssueJob.perform_later(issue.number)

    redirect_to root_path, notice: "Bug report submitted successfully! Issue ##{issue.number} created."
  rescue Octokit::Error => e
    Rails.logger.error "Failed to create GitHub issue: #{e.class} - #{e.message}"
    Rails.logger.error "Response status: #{e.response_status}" if e.respond_to?(:response_status)
    Rails.logger.error "Response body: #{e.response_body}" if e.respond_to?(:response_body)
    redirect_to new_feedback_path(type: "bug"), alert: "Failed to submit bug report: #{e.message}"
  end

  def create_feature_request
    # Generate title from the feature request
    title = params[:what_to_improve] || "Feature Request"

    issue = github_client.create_issue(
      github_repo,
      title,
      format_feature_request_body,
      labels: [ "feature-request", "needs-review" ]
    )

    redirect_to root_path, notice: "Feature request submitted successfully! Issue ##{issue.number} created."
  rescue Octokit::Error => e
    Rails.logger.error "Failed to create GitHub issue: #{e.class} - #{e.message}"
    Rails.logger.error "Response status: #{e.response_status}" if e.respond_to?(:response_status)
    Rails.logger.error "Response body: #{e.response_body}" if e.respond_to?(:response_body)
    redirect_to new_feedback_path(type: "feature"), alert: "Failed to submit feature request: #{e.message}"
  end

  def format_bug_report_body(screenshot_url = nil)
    # Parse console logs
    console_logs = if params[:console_logs].is_a?(String)
      begin
        parsed = JSON.parse(params[:console_logs])
        # Handle both array format (from test) and object format (from JS)
        if parsed.is_a?(Array)
          { "entries" => parsed, "capturedAt" => Time.current.iso8601 }
        else
          parsed
        end
      rescue JSON::ParserError
        { "entries" => [], "capturedAt" => Time.current.iso8601 }
      end
    else
      { "entries" => [], "capturedAt" => Time.current.iso8601 }
    end

    body = <<~MARKDOWN
      **Reporter:** #{current_user.email}
      **URL:** #{params[:page_url]}
      **Date:** #{Time.current.to_fs(:long)}

      ## Description
      #{params[:description]}
    MARKDOWN

    # Add screenshot if available
    if screenshot_url
      body += <<~MARKDOWN

        ## Screenshot
        ![Screenshot](#{screenshot_url})
      MARKDOWN
    end

    # Add console logs
    body += <<~MARKDOWN

      <details>
      <summary>Console Logs (#{console_logs["entries"]&.length || 0} entries)</summary>

      ```json
      #{JSON.pretty_generate(console_logs)}
      ```
      </details>
    MARKDOWN

    body
  end

  def format_feature_request_body
    <<~MARKDOWN
      **Reporter:** #{current_user.email}
      **Date:** #{Time.current.to_fs(:long)}

      ## Request Summary
      #{params[:what_to_improve]}

      ## Importance
      #{params[:importance_level]}

      ## Problem Definition
      **What problem are you trying to solve?**
      #{params[:problem_description]}

      **How do you handle this today?**
      #{params[:current_handling]}

      **How often?**
      #{params[:frequency]}

      ## Solution
      **Ideal solution:**
      #{params[:ideal_solution]}

      **Examples seen elsewhere:**
      #{params[:examples]}

      ## Context
      **Main goal:**
      #{params[:main_goal]}

      **Expected outcome:**
      #{params[:expected_outcome]}

      ## Impact
      **Business impact:**
      #{params[:business_impact]}

      **Success metrics:**
      #{params[:success_metrics]}

      **Additional notes:**
      #{params[:additional_notes]}
    MARKDOWN
  end


  def upload_screenshot_to_repo(issue_number, screenshot_data)
    # Convert base64 to binary
    image_data = Base64.decode64(screenshot_data.split(",").last)

    # Generate filename with format: YYYY-MM-DD-issue-NNN-screenshot.png
    timestamp = Time.current.strftime("%Y-%m-%d")
    filename = "#{timestamp}-issue-#{issue_number}-screenshot.png"
    path = ".github/bug-reports/#{filename}"

    # Upload to GitHub repository
    response = github_client.create_contents(
      github_repo,
      path,
      "Add screenshot for issue ##{issue_number}",
      image_data,
      branch: "main"
    )

    # Return the URL to the uploaded file
    # Use GitHub blob URL with ?raw=true for proper display in private repos
    "https://github.com/#{github_repo}/blob/main/#{path}?raw=true"
  rescue => e
    Rails.logger.error "Failed to upload screenshot to repo: #{e.message}"
    raise
  end

  def github_client
    @github_client ||= begin
      token = Rails.application.credentials.dig(:git_token) || ENV["GIT_TOKEN"]
      Rails.logger.debug "Creating GitHub client..."
      Rails.logger.debug "Token from credentials: #{Rails.application.credentials.dig(:git_token).present?}"
      Rails.logger.debug "Token from ENV: #{ENV['GIT_TOKEN'].present?}"
      Rails.logger.debug "Final token present: #{token.present?}"
      Rails.logger.debug "Token value: #{token&.first(10)}..." if token

      raise "No GitHub token configured" unless token.present?

      client = Octokit::Client.new(access_token: token)

      # Test authentication
      begin
        user = client.user
        Rails.logger.debug "GitHub client authenticated as: #{user.login}"
      rescue => e
        Rails.logger.error "GitHub client authentication test failed: #{e.message}"
        raise
      end

      client
    end
  end

  def github_repo
    Rails.application.credentials.dig(:git_repo) || ENV["GIT_REPO"] || "fluffyx/bos"
  end
end
