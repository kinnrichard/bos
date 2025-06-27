class GithubWebhooksController < ApplicationController
  skip_forgery_protection
  skip_before_action :require_login
  before_action :verify_github_signature

  def issue_comment
    event = params[:action_type] || request.headers["X-GitHub-Event"]

    case event
    when "issue_comment"
      handle_issue_comment
    else
      head :ok
    end
  end

  private

  def handle_issue_comment
    issue = params[:issue]
    comment = params[:comment]

    # Only process comments on feature request issues
    return head :ok unless issue["labels"].any? { |l| l["name"] == "feature-request" }

    # Only process comments from authorized users (admins/owners)
    return head :ok unless authorized_user?(comment["user"]["login"])

    # Check for action commands in the comment
    case comment["body"]
    when /\/generate-story/i
      ProcessFeatureStoryJob.perform_later(issue["number"], "generate_story")
      render json: { status: "Story generation queued" }
    when /\/approve-implementation/i
      ProcessFeatureStoryJob.perform_later(issue["number"], "approve_implementation")
      render json: { status: "Implementation queued" }
    when /\/decline/i
      decline_feature_request(issue["number"], comment["body"])
      render json: { status: "Feature request declined" }
    else
      head :ok
    end
  end

  def verify_github_signature
    payload_body = request.body.read
    signature = "sha256=" + OpenSSL::HMAC.hexdigest(
      OpenSSL::Digest.new("sha256"),
      webhook_secret,
      payload_body
    )

    unless Rack::Utils.secure_compare(signature, request.headers["X-Hub-Signature-256"])
      head :unauthorized
    end
  end

  def webhook_secret
    Rails.application.credentials.dig(:git_webhook_secret) || ENV["GIT_WEBHOOK_SECRET"]
  end

  def authorized_user?(username)
    # Get list of authorized users from config
    authorized_users = (ENV["GIT_AUTHORIZED_USERS"] || "").split(",").map(&:strip)
    authorized_users.include?(username)
  end

  def decline_feature_request(issue_number, comment_body)
    # Extract reason from comment if provided
    reason = comment_body.match(/\/decline\s+(.+)/i)&.captures&.first || "This feature request has been declined."

    github_client = Octokit::Client.new(
      access_token: Rails.application.credentials.dig(:git_token) || ENV["GIT_TOKEN"]
    )

    github_repo = Rails.application.credentials.dig(:git_repo) || ENV["GIT_REPO"] || "fluffyx/bos"

    # Close the issue with a comment
    github_client.add_comment(github_repo, issue_number, "Feature request declined: #{reason}")
    github_client.close_issue(github_repo, issue_number)
    github_client.add_labels_to_an_issue(github_repo, issue_number, [ "declined" ])
  rescue => e
    Rails.logger.error "Failed to decline feature request ##{issue_number}: #{e.message}"
  end
end
