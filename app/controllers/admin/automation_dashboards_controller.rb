class Admin::AutomationDashboardsController < ApplicationController
  before_action :require_admin

  def show
    render Views::Admin::AutomationDashboardView.new(
      current_user: current_user,
      stats: gather_automation_stats,
      recent_issues: fetch_recent_automated_issues,
      failed_issues: fetch_failed_issues,
      automation_enabled: ENV["BUG_AUTOMATION_ENABLED"] != "false",
      feature_notifications_enabled: ENV["FEATURE_EMAIL_NOTIFICATIONS"] != "false",
      active_section: :automation_dashboard
    )
  end

  def toggle_automation
    if params[:enable] == "true"
      ENV["BUG_AUTOMATION_ENABLED"] = "true"
      flash[:notice] = "Bug automation has been enabled"
    else
      ENV["BUG_AUTOMATION_ENABLED"] = "false"
      flash[:notice] = "Bug automation has been disabled"
    end

    redirect_to admin_automation_dashboard_path
  end

  def toggle_notifications
    if params[:enable] == "true"
      ENV["FEATURE_EMAIL_NOTIFICATIONS"] = "true"
      flash[:notice] = "Feature email notifications have been enabled"
    else
      ENV["FEATURE_EMAIL_NOTIFICATIONS"] = "false"
      flash[:notice] = "Feature email notifications have been disabled"
    end

    redirect_to admin_automation_dashboard_path
  end

  private

  def require_admin
    unless current_user&.admin? || current_user&.owner?
      redirect_to root_path, alert: "Access denied. Admin privileges required."
    end
  end

  def gather_automation_stats
    # Return mock data in test environment without GitHub token
    if Rails.env.test? && (Rails.application.credentials.dig(:github_token).nil? && ENV["GITHUB_TOKEN"].nil?)
      return {
        bug_reports: 0,
        feature_requests: 0,
        auto_fixed: 0,
        stories_generated: 0,
        automation_failed: 0,
        in_progress: 0
      }
    end

    github_client = Octokit::Client.new(
      access_token: Rails.application.credentials.dig(:github_token) || ENV["GITHUB_TOKEN"]
    )

    github_repo = Rails.application.credentials.dig(:github_repo) || ENV["GITHUB_REPO"] || "fluffyx/bos"

    # Get counts for various labels
    {
      bug_reports: count_issues_with_label(github_client, github_repo, "bug"),
      feature_requests: count_issues_with_label(github_client, github_repo, "feature-request"),
      auto_fixed: count_issues_with_label(github_client, github_repo, "pr-created"),
      stories_generated: count_issues_with_label(github_client, github_repo, "story-generated"),
      automation_failed: count_issues_with_label(github_client, github_repo, "automation-failed"),
      in_progress: count_issues_with_label(github_client, github_repo, "claude-processing") +
                   count_issues_with_label(github_client, github_repo, "claude-implementing")
    }
  rescue => e
    Rails.logger.error "Failed to gather automation stats: #{e.message}"
    {
      bug_reports: "N/A",
      feature_requests: "N/A",
      auto_fixed: "N/A",
      stories_generated: "N/A",
      automation_failed: "N/A",
      in_progress: "N/A"
    }
  end

  def count_issues_with_label(client, repo, label)
    client.search_issues("repo:#{repo} is:issue label:\"#{label}\"").total_count
  end

  def fetch_recent_automated_issues
    # Return empty array in test environment without GitHub token
    if Rails.env.test? && (Rails.application.credentials.dig(:github_token).nil? && ENV["GITHUB_TOKEN"].nil?)
      return []
    end

    github_client = Octokit::Client.new(
      access_token: Rails.application.credentials.dig(:github_token) || ENV["GITHUB_TOKEN"]
    )

    github_repo = Rails.application.credentials.dig(:github_repo) || ENV["GITHUB_REPO"] || "fluffyx/bos"

    # Get recent issues with automation labels
    search_query = "repo:#{github_repo} is:issue label:bug,feature-request sort:created-desc"
    results = github_client.search_issues(search_query)

    results.items.first(10).map do |issue|
      {
        number: issue.number,
        title: issue.title,
        state: issue.state,
        labels: issue.labels.map(&:name),
        created_at: issue.created_at,
        url: issue.html_url
      }
    end
  rescue => e
    Rails.logger.error "Failed to fetch recent issues: #{e.message}"
    []
  end

  def fetch_failed_issues
    # Return empty array in test environment without GitHub token
    if Rails.env.test? && (Rails.application.credentials.dig(:github_token).nil? && ENV["GITHUB_TOKEN"].nil?)
      return []
    end

    github_client = Octokit::Client.new(
      access_token: Rails.application.credentials.dig(:github_token) || ENV["GITHUB_TOKEN"]
    )

    github_repo = Rails.application.credentials.dig(:github_repo) || ENV["GITHUB_REPO"] || "fluffyx/bos"

    # Get issues that failed automation
    search_query = "repo:#{github_repo} is:issue is:open label:automation-failed"
    results = github_client.search_issues(search_query)

    results.items.map do |issue|
      {
        number: issue.number,
        title: issue.title,
        created_at: issue.created_at,
        url: issue.html_url
      }
    end
  rescue => e
    Rails.logger.error "Failed to fetch failed issues: #{e.message}"
    []
  end
end
