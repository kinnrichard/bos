class FeedbackController < ApplicationController
  before_action :set_feedback_type

  def new
    case @feedback_type
    when "bug"
      render Views::Feedback::BugReportView.new
    when "feature"
      render Views::Feedback::FeatureRequestView.new
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

  def create_bug_report
    issue = github_client.create_issue(
      github_repo,
      params[:title],
      format_bug_report_body,
      labels: [ "bug", "auto-fix" ]
    )

    # Attach screenshot if present
    if params[:screenshot].present?
      attach_screenshot_to_issue(issue.number, params[:screenshot])
    end

    # Queue the bug for processing
    ProcessBugIssueJob.perform_later(issue.number)

    redirect_to root_path, notice: "Bug report submitted successfully! Issue ##{issue.number} created."
  rescue Octokit::Error => e
    Rails.logger.error "Failed to create GitHub issue: #{e.message}"
    redirect_to new_feedback_path(type: "bug"), alert: "Failed to submit bug report. Please try again."
  end

  def create_feature_request
    issue = github_client.create_issue(
      github_repo,
      params[:title],
      format_feature_request_body,
      labels: [ "feature-request", "needs-review" ]
    )

    redirect_to root_path, notice: "Feature request submitted successfully! Issue ##{issue.number} created."
  rescue Octokit::Error => e
    Rails.logger.error "Failed to create GitHub issue: #{e.message}"
    redirect_to new_feedback_path(type: "feature"), alert: "Failed to submit feature request. Please try again."
  end

  def format_bug_report_body
    <<~MARKDOWN
      **Reporter:** #{current_user.email}
      **URL:** #{params[:page_url]}
      **Date:** #{Time.current.to_fs(:long)}

      ## Description
      #{params[:description]}

      ## Browser Info
      - User Agent: #{params[:user_agent]}
      - Viewport: #{params[:viewport_size]}

      <details>
      <summary>Console Logs</summary>

      ```json
      #{params[:console_logs]}
      ```
      </details>
    MARKDOWN
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

  def attach_screenshot_to_issue(issue_number, screenshot_data)
    # Convert base64 to binary
    image_data = Base64.decode64(screenshot_data.split(",").last)

    # Create a temporary file
    temp_file = Tempfile.new([ "screenshot", ".jpg" ])
    temp_file.binmode
    temp_file.write(image_data)
    temp_file.rewind

    # Upload to GitHub
    github_client.add_comment(
      github_repo,
      issue_number,
      "![Screenshot](#{upload_image_to_github(temp_file)})"
    )
  ensure
    temp_file&.close
    temp_file&.unlink
  end

  def upload_image_to_github(file)
    # This is a simplified version - in production you might want to use
    # GitHub's content API or a CDN for image hosting
    # For now, we'll include the image as a comment attachment
    "data:image/jpeg;base64,#{Base64.encode64(file.read)}"
  end

  def github_client
    @github_client ||= Octokit::Client.new(
      access_token: Rails.application.credentials.dig(:github_token) || ENV["GITHUB_TOKEN"]
    )
  end

  def github_repo
    Rails.application.credentials.dig(:github_repo) || ENV["GITHUB_REPO"] || "fluffyx/bos"
  end
end
