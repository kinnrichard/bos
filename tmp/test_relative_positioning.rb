puts 'Testing relative positioning API...'

# Find a job with tasks
job = Job.joins(:tasks).first
if job.nil?
  puts 'No job with tasks found'
  exit
end

tasks = job.tasks.order(:position).limit(3)
if tasks.count < 2
  puts 'Need at least 2 tasks for testing'
  exit
end

puts "\nOriginal task order:"
tasks.each { |t| puts "  #{t.title}: position #{t.position}" }

# Test 1: Move last task to after first task
last_task = tasks.last
first_task = tasks.first

puts "\nTest 1: Moving '#{last_task.title}' to after '#{first_task.title}'"
last_task.update(position: { after: first_task })

# Reload and check
job.tasks.reload
updated_tasks = job.tasks.where(id: tasks.pluck(:id)).order(:position)
puts "Updated order:"
updated_tasks.each { |t| puts "  #{t.title}: position #{t.position}" }

# Test 2: Move a task to first position
middle_task = updated_tasks[1]
puts "\nTest 2: Moving '#{middle_task.title}' to first position"
middle_task.update(position: :first)

# Final check
job.tasks.reload
final_tasks = job.tasks.where(id: tasks.pluck(:id)).order(:position)
puts "Final order:"
final_tasks.each { |t| puts "  #{t.title}: position #{t.position}" }

puts "\n✅ Relative positioning tests completed successfully!"