require "test_helper"
require "mocha/minitest"
require "ostruct"

class ProcessFeatureStoryJobTest < ActiveJob::TestCase
  setup do
    @issue_number = 456
    @mock_github_client = mock("github_client")

    # Stub github client creation
    Octokit::Client.stubs(:new).returns(@mock_github_client)

    @mock_issue = OpenStruct.new(
      number: @issue_number,
      title: "Test Feature Request",
      body: "Feature description",
      labels: []
    )
  end

  test "generate_story creates story and adds label" do
    @mock_github_client.expects(:issue).returns(@mock_issue)

    # Mock Claude execution
    Open3.expects(:popen3).yields(
      StringIO.new, # stdin
      StringIO.new("Generated BMAD story content"), # stdout
      StringIO.new(""), # stderr
      OpenStruct.new(value: OpenStruct.new(exitstatus: 0)) # wait_thr
    )

    @mock_github_client.expects(:add_comment).with(
      anything,
      @issue_number,
      includes("BMAD User Story Generated")
    )
    @mock_github_client.expects(:add_labels_to_an_issue).with(
      anything,
      @issue_number,
      [ "story-generated" ]
    )

    # Mock email notification
    mock_mailer = mock("mailer")
    NotificationMailer.expects(:story_generated).returns(mock_mailer)
    mock_mailer.expects(:deliver_later)

    ProcessFeatureStoryJob.perform_now(@issue_number, "generate_story")
  end

  test "generate_story skips if story already generated" do
    @mock_issue.labels = [ OpenStruct.new(name: "story-generated") ]
    @mock_github_client.expects(:issue).returns(@mock_issue)

    # Should not call Claude or add comments
    Open3.expects(:popen3).never
    @mock_github_client.expects(:add_comment).never
    @mock_github_client.expects(:add_labels_to_an_issue).never

    ProcessFeatureStoryJob.perform_now(@issue_number, "generate_story")
  end

  test "approve_implementation requires story to be generated first" do
    @mock_github_client.expects(:issue).returns(@mock_issue)

    @mock_github_client.expects(:add_comment).with(
      anything,
      @issue_number,
      includes("Cannot approve implementation")
    )

    # Should not proceed with implementation
    Open3.expects(:popen3).never

    ProcessFeatureStoryJob.perform_now(@issue_number, "approve_implementation")
  end

  test "approve_implementation processes when story exists" do
    @mock_issue.labels = [ OpenStruct.new(name: "story-generated") ]
    @mock_github_client.expects(:issue).returns(@mock_issue)

    # Mock getting story from comments
    mock_comment = OpenStruct.new(body: "USER STORY FORMAT: Test story")
    @mock_github_client.expects(:issue_comments).returns([ mock_comment ])

    @mock_github_client.expects(:add_labels_to_an_issue).with(
      anything,
      @issue_number,
      [ "claude-implementing" ]
    )

    # Mock Claude execution
    Open3.expects(:popen3).yields(
      StringIO.new, # stdin
      StringIO.new("Implementation started"), # stdout
      StringIO.new(""), # stderr
      OpenStruct.new(value: OpenStruct.new(exitstatus: 0)) # wait_thr
    )

    @mock_github_client.expects(:remove_label).with(
      anything,
      @issue_number,
      "claude-implementing"
    )
    @mock_github_client.expects(:add_labels_to_an_issue).with(
      anything,
      @issue_number,
      [ "implementation-pr-created" ]
    )
    @mock_github_client.expects(:add_comment).with(
      anything,
      @issue_number,
      includes("Implementation has been initiated")
    )

    # Mock email
    mock_mailer = mock("mailer")
    NotificationMailer.expects(:implementation_started).returns(mock_mailer)
    mock_mailer.expects(:deliver_later)

    ProcessFeatureStoryJob.perform_now(@issue_number, "approve_implementation")
  end

  test "handles unknown action" do
    Rails.logger.expects(:error).with(includes("Unknown action: invalid_action"))

    ProcessFeatureStoryJob.perform_now(@issue_number, "invalid_action")
  end

  test "handles errors during implementation" do
    @mock_issue.labels = [ OpenStruct.new(name: "story-generated") ]
    @mock_github_client.expects(:issue).returns(@mock_issue)
    @mock_github_client.expects(:issue_comments).returns([])
    @mock_github_client.expects(:add_labels_to_an_issue).with(
      anything,
      @issue_number,
      [ "claude-implementing" ]
    )

    # Mock Claude failure
    Open3.expects(:popen3).yields(
      StringIO.new, # stdin
      StringIO.new(""), # stdout
      StringIO.new("Error"), # stderr
      OpenStruct.new(value: OpenStruct.new(exitstatus: 1)) # wait_thr
    )

    @mock_github_client.expects(:remove_label).with(
      anything,
      @issue_number,
      "claude-implementing"
    )
    @mock_github_client.expects(:add_labels_to_an_issue).with(
      anything,
      @issue_number,
      [ "automation-failed" ]
    )
    @mock_github_client.expects(:add_comment).with(
      anything,
      @issue_number,
      includes("Implementation failed")
    )

    assert_raises(RuntimeError) do
      ProcessFeatureStoryJob.perform_now(@issue_number, "approve_implementation")
    end
  end

  test "respects email notification setting" do
    ENV["FEATURE_EMAIL_NOTIFICATIONS"] = "false"

    @mock_github_client.expects(:issue).returns(@mock_issue)

    # Mock Claude execution
    Open3.expects(:popen3).yields(
      StringIO.new, # stdin
      StringIO.new("Generated story"), # stdout
      StringIO.new(""), # stderr
      OpenStruct.new(value: OpenStruct.new(exitstatus: 0)) # wait_thr
    )

    @mock_github_client.expects(:add_comment)
    @mock_github_client.expects(:add_labels_to_an_issue)

    # Should not send email
    NotificationMailer.expects(:story_generated).never

    ProcessFeatureStoryJob.perform_now(@issue_number, "generate_story")
  ensure
    ENV.delete("FEATURE_EMAIL_NOTIFICATIONS")
  end
end
