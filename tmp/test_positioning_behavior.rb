puts 'Testing positioning gem behavior...'

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

# Test case: Move last task (position 3) to before middle task (position 2)
# Expected: [1, 3, 2] where moved task gets position 2
last_task = tasks.last
middle_task = tasks[1]

puts "\n=== Test: Move '#{last_task.title}' (pos #{last_task.position}) before '#{middle_task.title}' (pos #{middle_task.position}) ==="
puts "Expected result: Task should get position #{middle_task.position}, others shift up"

last_task.update(position: { before: middle_task })

# Check results
puts "\n=== After positioning gem update ==="
job.tasks.reload.order(:position).each do |t|
  puts "Position #{t.position}: #{t.title}"
end

puts "\n=== Analysis ==="
moved_task_final_position = last_task.reload.position
puts "Moved task final position: #{moved_task_final_position}"
puts "Expected position was: #{middle_task.position}"
puts "Match: #{moved_task_final_position == middle_task.position ? 'YES' : 'NO'}"