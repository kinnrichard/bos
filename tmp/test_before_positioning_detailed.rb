puts 'Testing positioning gem BEFORE behavior in detail...'

# Find a job with tasks
job = Job.joins(:tasks).first
if job.nil?
  puts 'No job with tasks found'
  exit
end

# Get exactly 3 tasks for testing
tasks = job.tasks.order(:position).limit(3)
if tasks.count < 3
  puts 'Need at least 3 tasks for testing'
  exit
end

puts "\n=== Initial State ==="
tasks.reload.each_with_index do |t, idx|
  puts "Position #{t.position}: #{t.title}"
end

# Test case: Move first task (position 1) to BEFORE third task (position 3)
# This simulates dragging Task 1 "above" Task 3
# Expected result: [Task 2(1), Task 1(2), Task 3(3)]
first_task = tasks.first
third_task = tasks.last

puts "\n=== Test: Move '#{first_task.title}' (pos #{first_task.position}) BEFORE '#{third_task.title}' (pos #{third_task.position}) ==="
puts "Expected result: Task 1 should get position 2 (immediately before Task 3)"

first_task.update(position: { before: third_task })

# Check results
puts "\n=== After positioning gem update ==="
job.tasks.reload.order(:position).each do |t|
  puts "Position #{t.position}: #{t.title}"
end

puts "\n=== Analysis ==="
moved_task_final_position = first_task.reload.position
puts "Task 1 final position: #{moved_task_final_position}"
puts "Task 3 final position: #{third_task.reload.position}"
puts "Expected Task 1 position: 2"
puts "Expected Task 3 position: 3"
puts "Task 1 correct: #{moved_task_final_position == 2 ? 'YES' : 'NO'}"
puts "Task 3 correct: #{third_task.reload.position == 3 ? 'YES' : 'NO'}"