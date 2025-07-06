require "test_helper"

class ActsAsListSimpleTest < ActionDispatch::IntegrationTest
  def setup
    @user = users(:admin)
    @client = clients(:acme)

    # Create a test job
    @job = Job.create!(
      title: "Test Job for acts_as_list",
      client: @client,
      created_by: @user
    )
  end

  def teardown
    # Clean up test data
    @job&.destroy
  end

  test "capture single task move behavior" do
    puts "\n=== Single Task Move Test ==="

    # Create simple numbered tasks
    tasks = {}
    (1..9).each do |i|
      tasks[i] = @job.tasks.create!(title: "Task #{i}", position: i)
    end

    puts "Initial positions:"
    tasks.each { |i, task| puts "  Task #{i}: position #{task.position}" }

    # Test: Move Task 3 to position 9 (like user's aa199df2 scenario)
    moving_task = tasks[3]
    target_position = 9

    puts "\nMoving Task 3 to position #{target_position}..."

    # Use acts_as_list insert_at method directly
    moving_task.insert_at(target_position)

    # Reload all tasks to see final state
    tasks.each { |i, task| tasks[i] = task.reload }

    puts "\nFinal positions after acts_as_list:"
    final_positions = {}
    tasks.each do |i, task|
      final_positions[i] = task.position
      puts "  Task #{i}: position #{task.position}"
    end

    # Export this result
    export_fixture("single_task_move", {
      description: "Task 3 moved from position 3 to position 9",
      initial_positions: (1..9).to_a.map { |i| [ i, i ] }.to_h,
      operation: { task: 3, from_position: 3, to_position: target_position },
      final_positions: final_positions
    })

    puts "\nKey observation: Task 3 ended up at position #{final_positions[3]}"
  end

  test "capture multi task move behavior" do
    puts "\n=== Multi Task Move Test ==="

    # Create simple numbered tasks
    tasks = {}
    (1..9).each do |i|
      tasks[i] = @job.tasks.create!(title: "Task #{i}", position: i)
    end

    puts "Initial positions:"
    tasks.each { |i, task| puts "  Task #{i}: position #{task.position}" }

    # Test: Move Tasks 3 and 4 to positions 7 and 8
    puts "\nMoving Tasks 3 and 4 to positions 7 and 8..."

    # Move them in sequence to see what happens
    tasks[3].insert_at(7)
    tasks[3] = tasks[3].reload
    puts "After moving Task 3 to position 7:"
    tasks.each { |i, task| puts "  Task #{i}: position #{task.reload.position}" }

    tasks[4] = tasks[4].reload  # Important: reload before second move
    tasks[4].insert_at(8)

    # Reload all tasks to see final state
    tasks.each { |i, task| tasks[i] = task.reload }

    puts "\nFinal positions after both moves:"
    final_positions = {}
    tasks.each do |i, task|
      final_positions[i] = task.position
      puts "  Task #{i}: position #{task.position}"
    end

    export_fixture("multi_task_move", {
      description: "Tasks 3 and 4 moved to positions 7 and 8",
      initial_positions: (1..9).to_a.map { |i| [ i, i ] }.to_h,
      operations: [
        { task: 3, to_position: 7 },
        { task: 4, to_position: 8 }
      ],
      final_positions: final_positions
    })
  end

  test "capture three task move behavior" do
    puts "\n=== Three Task Move Test ==="

    # Create 8 tasks
    tasks = {}
    (1..8).each do |i|
      tasks[i] = @job.tasks.create!(title: "Task #{i}", position: i)
    end

    puts "Initial positions:"
    tasks.each { |i, task| puts "  Task #{i}: position #{task.position}" }

    # Move first 3 tasks to positions 6, 7, 8
    puts "\nMoving Tasks 1, 2, 3 to positions 6, 7, 8..."

    tasks[1].insert_at(6)
    tasks[1] = tasks[1].reload

    tasks[2] = tasks[2].reload
    tasks[2].insert_at(7)
    tasks[2] = tasks[2].reload

    tasks[3] = tasks[3].reload
    tasks[3].insert_at(8)

    # Reload all tasks
    tasks.each { |i, task| tasks[i] = task.reload }

    puts "\nFinal positions:"
    final_positions = {}
    tasks.each do |i, task|
      final_positions[i] = task.position
      puts "  Task #{i}: position #{task.position}"
    end

    export_fixture("three_task_move", {
      description: "Tasks 1, 2, 3 moved to positions 6, 7, 8",
      initial_positions: (1..8).to_a.map { |i| [ i, i ] }.to_h,
      operations: [
        { task: 1, to_position: 6 },
        { task: 2, to_position: 7 },
        { task: 3, to_position: 8 }
      ],
      final_positions: final_positions
    })
  end

  private

  def export_fixture(test_name, result)
    fixtures_dir = Rails.root.join("frontend", "src", "lib", "utils", "test-fixtures")
    FileUtils.mkdir_p(fixtures_dir)

    fixture_file = fixtures_dir.join("#{test_name}.json")

    fixture_data = {
      description: "Actual Rails acts_as_list behavior for #{test_name}",
      generated_at: Time.current.iso8601,
      rails_env: Rails.env,
      acts_as_list_scope: "[:job_id, :parent_id]",
      test_result: result
    }

    File.write(fixture_file, JSON.pretty_generate(fixture_data))
    puts "Exported fixture to: #{fixture_file}"
  end
end
