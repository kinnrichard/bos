puts 'Testing positioning gem AFTER behavior...'

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

# Test case: Move first task (position 1) to AFTER middle task (position 2)
# Expected: [2, 1, 3] where moved task gets position 3 (after position 2)
first_task = tasks.first
middle_task = tasks[1]

puts "\n=== Test: Move '#{first_task.title}' (pos #{first_task.position}) AFTER '#{middle_task.title}' (pos #{middle_task.position}) ==="
puts "Expected result: Task should get position #{middle_task.position + 1}"

first_task.update(position: { after: middle_task })

# Check results
puts "\n=== After positioning gem update ==="
job.tasks.reload.order(:position).each do |t|
  puts "Position #{t.position}: #{t.title}"
end

puts "\n=== Analysis ==="
moved_task_final_position = first_task.reload.position
expected_position = middle_task.position + 1
puts "Moved task final position: #{moved_task_final_position}"
puts "Expected position was: #{expected_position}"
puts "Match: #{moved_task_final_position == expected_position ? 'YES' : 'NO'}"