puts 'Testing cross-parent BEFORE positioning behavior...'

# Find a job with tasks
job = Job.joins(:tasks).first
if job.nil?
  puts 'No job with tasks found'
  exit
end

# Create a setup that matches the user's scenario
# We need: Task 1 (top-level), Task 3 (top-level), Task 2 (child of Task 3)
tasks = job.tasks.order(:position).limit(3)
if tasks.count < 3
  puts 'Need at least 3 tasks for testing'
  exit
end

# Set up the scenario: Task 2 as child of Task 3
task1, task2, task3 = tasks[0], tasks[1], tasks[2]
task1.update!(parent_id: nil, position: 1)
task3.update!(parent_id: nil, position: 3) 
task2.update!(parent_id: task3.id, position: 1)

puts "\n=== Initial State (matching user scenario) ==="
puts "Task 1: position #{task1.reload.position}, parent_id: #{task1.parent_id || 'null'} (top-level)"
puts "Task 3: position #{task3.reload.position}, parent_id: #{task3.parent_id || 'null'} (top-level)"
puts "Task 2: position #{task2.reload.position}, parent_id: #{task2.parent_id ? task2.parent_id[0..7] : 'null'} (child of Task 3)"

puts "\n=== Test: Move Task 2 from child of Task 3 to before Task 3 at top-level ==="
puts "Expected client prediction: Task 2 should get position 2, Task 3 stays at position 3"

# Perform the cross-parent before operation
task2.update!(parent_id: nil, position: { before: task3 })

puts "\n=== After cross-parent BEFORE operation ==="
job.tasks.reload.order(:position).each do |t|
  parent_display = t.parent_id ? t.parent_id[0..7] : 'null'
  puts "#{t.title}: position #{t.position}, parent_id: #{parent_display}"
end

puts "\n=== Analysis ==="
task2_final_pos = task2.reload.position
task3_final_pos = task3.reload.position
puts "Task 2 final position: #{task2_final_pos} (expected: 2)"
puts "Task 3 final position: #{task3_final_pos} (expected: 3)"
puts "Task 2 positioned correctly: #{task2_final_pos == 2 ? 'YES' : 'NO'}"
puts "Task 3 unchanged: #{task3_final_pos == 3 ? 'YES' : 'NO'}"