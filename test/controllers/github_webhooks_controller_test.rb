require "test_helper"
require "mocha/minitest"

class GithubWebhooksControllerTest < ActionDispatch::IntegrationTest
  setup do
    @webhook_secret = "test_secret"
    ENV["GITHUB_WEBHOOK_SECRET"] = @webhook_secret
    ENV["GITHUB_AUTHORIZED_USERS"] = "admin_user,owner_user"

    @issue_comment_payload = {
      action: "created",
      issue: {
        number: 123,
        title: "Test Feature Request",
        labels: [ { name: "feature-request" } ]
      },
      comment: {
        body: "/generate-story",
        user: { login: "admin_user" }
      }
    }.to_json
  end

  teardown do
    ENV.delete("GITHUB_WEBHOOK_SECRET")
    ENV.delete("GITHUB_AUTHORIZED_USERS")
  end

  test "rejects requests without valid signature" do
    post github_webhook_path,
         params: @issue_comment_payload,
         headers: {
           "Content-Type" => "application/json",
           "X-GitHub-Event" => "issue_comment",
           "X-Hub-Signature-256" => "invalid_signature"
         }

    assert_response :unauthorized
  end

  test "accepts requests with valid signature" do
    signature = generate_signature(@issue_comment_payload)

    ProcessFeatureStoryJob.expects(:perform_later).with(123, "generate_story")

    post github_webhook_path,
         params: @issue_comment_payload,
         headers: {
           "Content-Type" => "application/json",
           "X-GitHub-Event" => "issue_comment",
           "X-Hub-Signature-256" => signature
         }

    assert_response :success
    assert_equal({ "status" => "Story generation queued" }, JSON.parse(response.body))
  end

  test "ignores non-feature-request issues" do
    payload = {
      action: "created",
      issue: {
        number: 123,
        labels: [ { name: "bug" } ]
      },
      comment: {
        body: "/generate-story",
        user: { login: "admin_user" }
      }
    }.to_json

    signature = generate_signature(payload)

    ProcessFeatureStoryJob.expects(:perform_later).never

    post github_webhook_path,
         params: payload,
         headers: {
           "Content-Type" => "application/json",
           "X-GitHub-Event" => "issue_comment",
           "X-Hub-Signature-256" => signature
         }

    assert_response :success
  end

  test "ignores comments from unauthorized users" do
    payload = {
      action: "created",
      issue: {
        number: 123,
        labels: [ { name: "feature-request" } ]
      },
      comment: {
        body: "/generate-story",
        user: { login: "random_user" }
      }
    }.to_json

    signature = generate_signature(payload)

    ProcessFeatureStoryJob.expects(:perform_later).never

    post github_webhook_path,
         params: payload,
         headers: {
           "Content-Type" => "application/json",
           "X-GitHub-Event" => "issue_comment",
           "X-Hub-Signature-256" => signature
         }

    assert_response :success
  end

  test "handles /approve-implementation command" do
    payload = {
      action: "created",
      issue: {
        number: 123,
        labels: [ { name: "feature-request" } ]
      },
      comment: {
        body: "/approve-implementation",
        user: { login: "owner_user" }
      }
    }.to_json

    signature = generate_signature(payload)

    ProcessFeatureStoryJob.expects(:perform_later).with(123, "approve_implementation")

    post github_webhook_path,
         params: payload,
         headers: {
           "Content-Type" => "application/json",
           "X-GitHub-Event" => "issue_comment",
           "X-Hub-Signature-256" => signature
         }

    assert_response :success
    assert_equal({ "status" => "Implementation queued" }, JSON.parse(response.body))
  end

  test "handles /decline command" do
    payload = {
      action: "created",
      issue: {
        number: 123,
        labels: [ { name: "feature-request" } ]
      },
      comment: {
        body: "/decline Not aligned with product roadmap",
        user: { login: "admin_user" }
      }
    }.to_json

    signature = generate_signature(payload)

    mock_client = mock("github_client")
    Octokit::Client.expects(:new).returns(mock_client)
    mock_client.expects(:add_comment).with(anything, 123, includes("Feature request declined"))
    mock_client.expects(:close_issue).with(anything, 123)
    mock_client.expects(:add_labels_to_an_issue).with(anything, 123, [ "declined" ])

    post github_webhook_path,
         params: payload,
         headers: {
           "Content-Type" => "application/json",
           "X-GitHub-Event" => "issue_comment",
           "X-Hub-Signature-256" => signature
         }

    assert_response :success
    assert_equal({ "status" => "Feature request declined" }, JSON.parse(response.body))
  end

  test "ignores regular comments" do
    payload = {
      action: "created",
      issue: {
        number: 123,
        labels: [ { name: "feature-request" } ]
      },
      comment: {
        body: "This is just a regular comment",
        user: { login: "admin_user" }
      }
    }.to_json

    signature = generate_signature(payload)

    ProcessFeatureStoryJob.expects(:perform_later).never

    post github_webhook_path,
         params: payload,
         headers: {
           "Content-Type" => "application/json",
           "X-GitHub-Event" => "issue_comment",
           "X-Hub-Signature-256" => signature
         }

    assert_response :success
  end

  private

  def generate_signature(payload)
    "sha256=" + OpenSSL::HMAC.hexdigest(
      OpenSSL::Digest.new("sha256"),
      @webhook_secret,
      payload
    )
  end
end
