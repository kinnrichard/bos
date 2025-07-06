require "test_helper"

class ActsAsListBehaviorTest < ActionDispatch::IntegrationTest
  def setup
    @user = users(:admin_user)
    @client = clients(:basic_client)

    # Create a test job
    @job = Job.create!(
      title: "Test Job for acts_as_list",
      client: @client,
      created_by: @user
    )

    # Create initial tasks with known positions
    @tasks = {}
    create_test_tasks
  end

  def teardown
    # Clean up test data
    @job.destroy if @job.persisted?
  end

  test "single task above positioning matches user bug scenario" do
    puts "\n=== Testing Single Task Above Positioning ==="
    puts "Initial positions:"
    print_task_positions

    # User scenario: aa199df2 (position 3) dropped "above" 413d84d5 (position 9)
    # Expected: Rails puts aa199df2 at position 7 (from user logs)

    # Using Rails batch_reorder API to simulate the drag operation
    target_position = 9  # Position of 413d84d5 before insertion

    post "/api/v1/jobs/#{@job.id}/tasks/batch_reorder",
      params: {
        positions: [
          {
            id: @tasks[:aa199df2].id,
            position: target_position,
            lock_version: @tasks[:aa199df2].lock_version
          }
        ]
      },
      headers: auth_headers

    assert_response :success

    # Reload tasks to get final positions
    reload_tasks
    puts "\nFinal positions after Rails acts_as_list:"
    print_task_positions

    # Record the actual Rails behavior
    final_positions = get_final_positions

    puts "\nKey results:"
    puts "- aa199df2 ended at position: #{final_positions[:aa199df2]}"
    puts "- 413d84d5 (target) ended at position: #{final_positions[:_413d84d5]}"

    # Export this result for TypeScript tests
    export_test_result("single_task_above_positioning", {
      description: "aa199df2 (pos 3) moved to position 9 (above 413d84d5)",
      initial_positions: get_initial_positions,
      operation: { task_id: :aa199df2, target_position: target_position },
      final_positions: final_positions
    })
  end

  test "multi task above positioning" do
    puts "\n=== Testing Multi-Task Above Positioning ==="
    puts "Initial positions:"
    print_task_positions

    # Move both aa199df2 and 573af5c6 to consecutive positions starting at 7
    post "/api/v1/jobs/#{@job.id}/tasks/batch_reorder",
      params: {
        positions: [
          {
            id: @tasks[:aa199df2].id,
            position: 7,
            lock_version: @tasks[:aa199df2].lock_version
          },
          {
            id: @tasks[:_573af5c6].id,
            position: 8,
            lock_version: @tasks[:_573af5c6].lock_version
          }
        ]
      },
      headers: auth_headers

    assert_response :success

    reload_tasks
    puts "\nFinal positions after Rails acts_as_list:"
    print_task_positions

    final_positions = get_final_positions

    export_test_result("multi_task_above_positioning", {
      description: "aa199df2 (pos 3) and 573af5c6 (pos 4) moved to positions 7,8",
      initial_positions: get_initial_positions,
      operation: {
        moves: [
          { task_id: :aa199df2, target_position: 7 },
          { task_id: :_573af5c6, target_position: 8 }
        ]
      },
      final_positions: final_positions
    })
  end

  test "three task move down off by 2 scenario" do
    puts "\n=== Testing Three-Task Move Down (Off-by-2 Scenario) ==="

    # Create simpler task set for this test
    @job.tasks.destroy_all
    simple_tasks = {}
    (1..8).each do |i|
      simple_tasks["task#{i}".to_sym] = @job.tasks.create!(
        title: "Task #{i}",
        position: i
      )
    end

    puts "Initial positions:"
    simple_tasks.each { |key, task| puts "  #{key}: #{task.position}" }

    # Move first 3 tasks to positions 6, 7, 8
    post "/api/v1/jobs/#{@job.id}/tasks/batch_reorder",
      params: {
        positions: [
          { id: simple_tasks[:task1].id, position: 6, lock_version: simple_tasks[:task1].lock_version },
          { id: simple_tasks[:task2].id, position: 7, lock_version: simple_tasks[:task2].lock_version },
          { id: simple_tasks[:task3].id, position: 8, lock_version: simple_tasks[:task3].lock_version }
        ]
      },
      headers: auth_headers

    assert_response :success

    # Reload and check final positions
    simple_tasks.each { |key, task| simple_tasks[key] = task.reload }

    puts "\nFinal positions after Rails acts_as_list:"
    final_positions = {}
    simple_tasks.each do |key, task|
      final_positions[key] = task.position
      puts "  #{key}: #{task.position}"
    end

    export_test_result("three_task_move_down", {
      description: "Tasks 1,2,3 moved from positions 1,2,3 to 6,7,8",
      initial_positions: (1..8).map { |i| [ "task#{i}".to_sym, i ] }.to_h,
      operation: {
        moves: [
          { task_id: :task1, target_position: 6 },
          { task_id: :task2, target_position: 7 },
          { task_id: :task3, target_position: 8 }
        ]
      },
      final_positions: final_positions
    })
  end

  private

  def create_test_tasks
    # Create tasks matching the user's bug report scenario
    task_data = [
      { key: :aa199df2, title: "Task aa199df2", position: 3 },
      { key: :_573af5c6, title: "Task 573af5c6", position: 4 },
      { key: :_0d6d43c1, title: "Task 0d6d43c1", position: 5 },
      { key: :d4754ddf, title: "Task d4754ddf", position: 6 },
      { key: :c180c0ed, title: "Task c180c0ed", position: 7 },
      { key: :f6d7132a, title: "Task f6d7132a", position: 8 },
      { key: :_413d84d5, title: "Task 413d84d5", position: 9 },
      { key: :_0bd45386, title: "Task 0bd45386", position: 10 },
      { key: :f07927d6, title: "Task f07927d6", position: 11 }
    ]

    task_data.each do |data|
      @tasks[data[:key]] = @job.tasks.create!(
        title: data[:title],
        position: data[:position]
      )
    end
  end

  def auth_headers
    # Mock basic auth for API access
    { "Authorization" => "Bearer mock_token" }
  end

  def reload_tasks
    @tasks.each { |key, task| @tasks[key] = task.reload }
  end

  def print_task_positions
    @tasks.each do |key, task|
      puts "  #{key}: #{task.position}"
    end
  end

  def get_initial_positions
    {
      aa199df2: 3, _573af5c6: 4, _0d6d43c1: 5, d4754ddf: 6, c180c0ed: 7,
      f6d7132a: 8, _413d84d5: 9, _0bd45386: 10, f07927d6: 11
    }
  end

  def get_final_positions
    final_positions = {}
    @tasks.each { |key, task| final_positions[key] = task.position }
    final_positions
  end

  def export_test_result(test_name, result)
    fixtures_dir = Rails.root.join("frontend", "src", "lib", "utils", "test-fixtures")
    FileUtils.mkdir_p(fixtures_dir)

    fixture_file = fixtures_dir.join("#{test_name}.json")

    fixture_data = {
      description: "Actual Rails acts_as_list behavior for #{test_name}",
      generated_at: Time.current.iso8601,
      rails_env: Rails.env,
      test_result: result
    }

    File.write(fixture_file, JSON.pretty_generate(fixture_data))
    puts "\nExported fixture to: #{fixture_file}"
  end
end
