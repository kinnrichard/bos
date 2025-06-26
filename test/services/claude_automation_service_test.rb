require "test_helper"
require "mocha/minitest"
require "ostruct"

class ClaudeAutomationServiceTest < ActiveSupport::TestCase
  setup do
    @issue_number = 123
    @mock_github_client = mock("github_client")
    @service = ClaudeAutomationService.new(@issue_number)
    @service.instance_variable_set(:@github_client, @mock_github_client)

    @mock_issue = OpenStruct.new(
      number: @issue_number,
      title: "Test Bug",
      body: "Bug description with console logs",
      html_url: "https://github.com/test/repo/issues/123"
    )
  end

  test "process successfully processes bug issue" do
    # Mock GitHub API calls
    @mock_github_client.expects(:issue).returns(@mock_issue)
    @mock_github_client.expects(:add_labels_to_an_issue).with(anything, @issue_number, [ "claude-processing" ])
    @mock_github_client.expects(:remove_label).with(anything, @issue_number, "claude-processing")
    @mock_github_client.expects(:add_labels_to_an_issue).with(anything, @issue_number, [ "pr-created" ])
    @mock_github_client.expects(:add_comment).with(anything, @issue_number, includes("Claude has processed"))

    # Mock Claude CLI execution
    Open3.expects(:popen3).yields(
      StringIO.new, # stdin
      StringIO.new("Claude processed successfully"), # stdout
      StringIO.new(""), # stderr
      OpenStruct.new(value: OpenStruct.new(exitstatus: 0)) # wait_thr
    )

    result = @service.process
    assert result.include?("Claude processed successfully")
  end

  test "process handles Claude CLI failure" do
    @mock_github_client.expects(:issue).returns(@mock_issue)
    @mock_github_client.expects(:add_labels_to_an_issue).with(anything, @issue_number, [ "claude-processing" ])
    @mock_github_client.expects(:remove_label).with(anything, @issue_number, "claude-processing")
    @mock_github_client.expects(:add_labels_to_an_issue).with(anything, @issue_number, [ "automation-failed" ])
    @mock_github_client.expects(:add_comment).with(anything, @issue_number, includes("Automation failed"))

    # Mock Claude CLI failure
    Open3.expects(:popen3).yields(
      StringIO.new, # stdin
      StringIO.new(""), # stdout
      StringIO.new("Error: Claude failed"), # stderr
      OpenStruct.new(value: OpenStruct.new(exitstatus: 1)) # wait_thr
    )

    assert_raises(ClaudeAutomationService::ClaudeExecutionError) do
      @service.process
    end
  end

  test "generate_bug_fix_prompt includes BMAD methodology" do
    prompt = @service.send(:generate_bug_fix_prompt, @mock_issue)

    assert prompt.include?("BMAD METHODOLOGY INSTRUCTIONS")
    assert prompt.include?("ANALYZE (QA Agent approach)")
    assert prompt.include?("CREATE STORY (Story Manager approach)")
    assert prompt.include?("IMPLEMENT (Dev Agent approach)")
    assert prompt.include?("GIT WORKFLOW")
    assert prompt.include?("CREATE PR")
    assert prompt.include?("fix/issue-#{@issue_number}")
    assert prompt.include?("Fixes ##{@issue_number}")
  end

  test "extract_console_logs parses JSON from issue body" do
    issue_body = <<~BODY
      Bug description

      <details>
      <summary>Console Logs (2 entries)</summary>

      ```json
      {
        "entries": [
          {"type": "error", "message": "Test error"},
          {"type": "log", "message": "Test log"}
        ]
      }
      ```
      </details>
    BODY

    logs = @service.send(:extract_console_logs, issue_body)
    assert_equal 2, logs["entries"].length
    assert_equal "error", logs["entries"][0]["type"]
  end

  test "extract_console_logs handles missing console logs" do
    issue_body = "Bug description without console logs"
    logs = @service.send(:extract_console_logs, issue_body)
    assert_nil logs
  end

  test "extract_console_logs handles malformed JSON" do
    issue_body = <<~BODY
      <details>
      <summary>Console Logs</summary>

      ```json
      {invalid json}
      ```
      </details>
    BODY

    logs = @service.send(:extract_console_logs, issue_body)
    assert_nil logs
  end

  test "execute_claude_cli creates temporary file with prompt" do
    prompt = "Test prompt"
    temp_file = mock("tempfile")
    temp_file.expects(:write).with(prompt)
    temp_file.expects(:close)
    temp_file.expects(:path).returns("/tmp/test.txt")
    temp_file.expects(:unlink)

    Tempfile.expects(:new).returns(temp_file)

    Open3.expects(:popen3).with("claude --conversation-id issue-#{@issue_number} < /tmp/test.txt").yields(
      StringIO.new, # stdin
      StringIO.new("Success"), # stdout
      StringIO.new(""), # stderr
      OpenStruct.new(value: OpenStruct.new(exitstatus: 0)) # wait_thr
    )

    result = @service.send(:execute_claude_cli, prompt)
    assert_equal "Success", result
  end

  test "removes processing label even if not found" do
    @mock_github_client.expects(:remove_label).raises(Octokit::NotFound)

    # Should not raise error
    @service.send(:remove_label, "non-existent-label")
  end
end
