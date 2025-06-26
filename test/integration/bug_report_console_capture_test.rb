require "test_helper"
require "mocha/minitest"

class BugReportConsoleCaptureTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:technician)
    sign_in_as(@user)

    # Mock GitHub client
    @mock_client = mock("github_client")
    Octokit::Client.stubs(:new).returns(@mock_client)
  end

  test "bug report includes console logs with proper structure" do
    issue = OpenStruct.new(number: 123)

    # Expect console logs to be included in the issue body
    @mock_client.expects(:create_issue).with(
      anything,
      "Test Bug",
      includes("Console Logs"),
      labels: [ "bug", "auto-fix" ]
    ).returns(issue)

    # Mock job queueing
    ProcessBugIssueJob.expects(:perform_later).with(123)

    # Submit bug report with console logs
    post feedback_path, params: {
      type: "bug",
      title: "Test Bug",
      description: "Test description",
      page_url: "https://example.com/test",
      user_agent: "Mozilla/5.0 Test",
      viewport_size: "1920x1080",
      console_logs: {
        entries: [
          {
            type: "error",
            timestamp: "2024-01-01T12:00:00Z",
            message: "Test error message",
            stack: "Error stack trace"
          },
          {
            type: "log",
            timestamp: "2024-01-01T12:00:01Z",
            message: "Test log message",
            stack: nil
          }
        ],
        capturedAt: "2024-01-01T12:00:02Z",
        totalCaptured: 2,
        userAgent: "Mozilla/5.0 Test",
        url: "https://example.com/test",
        viewport: { width: 1920, height: 1080 }
      }.to_json,
      screenshot: nil
    }

    assert_redirected_to root_path
    assert_equal "Bug report submitted successfully! Issue #123 created.", flash[:notice]
  end

  test "bug report handles malformed console logs gracefully" do
    issue = OpenStruct.new(number: 124)

    # Should still create issue even with malformed console logs
    @mock_client.expects(:create_issue).returns(issue)
    ProcessBugIssueJob.expects(:perform_later).with(124)

    post feedback_path, params: {
      type: "bug",
      title: "Test Bug",
      description: "Test description",
      page_url: "https://example.com/test",
      user_agent: "Mozilla/5.0 Test",
      viewport_size: "1920x1080",
      console_logs: "malformed json {[}]",
      screenshot: nil
    }

    assert_redirected_to root_path
    assert_equal "Bug report submitted successfully! Issue #124 created.", flash[:notice]
  end

  test "bug report handles empty console logs" do
    issue = OpenStruct.new(number: 125)

    @mock_client.expects(:create_issue).returns(issue)
    ProcessBugIssueJob.expects(:perform_later).with(125)

    post feedback_path, params: {
      type: "bug",
      title: "Test Bug",
      description: "Test description",
      page_url: "https://example.com/test",
      user_agent: "Mozilla/5.0 Test",
      viewport_size: "1920x1080",
      console_logs: "",
      screenshot: nil
    }

    assert_redirected_to root_path
    assert_equal "Bug report submitted successfully! Issue #125 created.", flash[:notice]
  end
end
