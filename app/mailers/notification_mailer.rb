class NotificationMailer < ApplicationMailer
  def story_generated(issue_number, issue_title)
    @issue_number = issue_number
    @issue_title = issue_title
    @issue_url = "#{github_url}/issues/#{issue_number}"

    mail(
      to: admin_emails,
      subject: "[BOS] Story Generated for Feature Request ##{issue_number}"
    ) do |format|
      format.text { render plain: story_generated_text }
      format.html { render html: story_generated_html.html_safe }
    end
  end

  def implementation_started(issue_number, issue_title)
    @issue_number = issue_number
    @issue_title = issue_title
    @issue_url = "#{github_url}/issues/#{issue_number}"

    mail(
      to: admin_emails,
      subject: "[BOS] Implementation Started for Feature ##{issue_number}"
    ) do |format|
      format.text { render plain: implementation_started_text }
      format.html { render html: implementation_started_html.html_safe }
    end
  end

  def automation_failed(issue_number, error_message)
    @issue_number = issue_number
    @error_message = error_message
    @issue_url = "#{github_url}/issues/#{issue_number}"

    mail(
      to: admin_emails,
      subject: "[BOS] ⚠️ Automation Failed for Issue ##{issue_number}"
    ) do |format|
      format.text { render plain: automation_failed_text }
      format.html { render html: automation_failed_html.html_safe }
    end
  end

  private

  def admin_emails
    ENV["ADMIN_EMAILS"]&.split(",")&.map(&:strip) || [ "admin@example.com" ]
  end

  def github_url
    repo = Rails.application.credentials.dig(:git_repo) || ENV["GIT_REPO"] || "fluffyx/bos"
    "https://github.com/#{repo}"
  end

  def story_generated_text
    <<~TEXT
      A BMAD story has been generated for feature request ##{@issue_number}.

      Title: #{@issue_title}

      View the story and take action:
      #{@issue_url}

      Available actions:
      - Review the generated story
      - Use /approve-implementation to start implementation
      - Use /decline [reason] to close the request
    TEXT
  end

  def story_generated_html
    <<~HTML
      <h2>Story Generated for Feature Request</h2>

      <p>A BMAD story has been generated for feature request <strong>##{@issue_number}</strong>.</p>

      <p><strong>Title:</strong> #{@issue_title}</p>

      <p><a href="#{@issue_url}">View the story and take action</a></p>

      <h3>Available Actions:</h3>
      <ul>
        <li>Review the generated story</li>
        <li>Use <code>/approve-implementation</code> to start implementation</li>
        <li>Use <code>/decline [reason]</code> to close the request</li>
      </ul>
    HTML
  end

  def implementation_started_text
    <<~TEXT
      Claude has started implementing feature ##{@issue_number}.

      Title: #{@issue_title}

      A pull request will be created shortly. Monitor progress:
      #{@issue_url}
    TEXT
  end

  def implementation_started_html
    <<~HTML
      <h2>Implementation Started</h2>

      <p>Claude has started implementing feature <strong>##{@issue_number}</strong>.</p>

      <p><strong>Title:</strong> #{@issue_title}</p>

      <p>A pull request will be created shortly.</p>

      <p><a href="#{@issue_url}">Monitor progress</a></p>
    HTML
  end

  def automation_failed_text
    <<~TEXT
      Automation failed for issue ##{@issue_number}.

      Error: #{@error_message}

      Please check the issue for details:
      #{@issue_url}
    TEXT
  end

  def automation_failed_html
    <<~HTML
      <h2>⚠️ Automation Failed</h2>

      <p>Automation failed for issue <strong>##{@issue_number}</strong>.</p>

      <p><strong>Error:</strong> #{@error_message}</p>

      <p><a href="#{@issue_url}">Check the issue for details</a></p>
    HTML
  end
end
