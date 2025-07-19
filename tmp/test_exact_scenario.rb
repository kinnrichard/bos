puts 'Testing exact scenario from logs...'

# Find a job with tasks
job = Job.joins(:tasks).first
if job.nil?
  puts 'No job with tasks found'
  exit
end

# Clear existing tasks and recreate exact scenario
job.tasks.destroy_all

# Create tasks with exact positions from the logs
task1 = job.tasks.create!(title: "Task 1", position: 1, parent_id: nil)
task3 = job.tasks.create!(title: "Task 3", position: 3, parent_id: nil)
task2 = job.tasks.create!(title: "Task 2", position: 1, parent_id: task3.id)

puts "\n=== Exact Initial State (from logs) ==="
job.tasks.reload.order(:position).each do |t|
  parent_display = t.parent_id ? "#{t.parent_id[0..7]} (#{Task.find(t.parent_id).title})" : 'null'
  puts "#{t.title}: position #{t.position}, parent_id: #{parent_display}"
end

puts "\n=== Operation: task2.update!(parent_id: nil, position: { before: task3 }) ==="
puts "This should replicate the server operation from the logs"

# This is exactly what the server does when it receives before_task_id: task3
task2.update!(parent_id: nil, position: { before: task3 })

puts "\n=== Final State ==="
job.tasks.reload.order(:position).each do |t|
  parent_display = t.parent_id ? "#{t.parent_id[0..7]} (#{Task.find(t.parent_id).title})" : 'null'
  puts "#{t.title}: position #{t.position}, parent_id: #{parent_display}"
end

puts "\n=== Analysis ==="
task1_final = task1.reload.position
task2_final = task2.reload.position
task3_final = task3.reload.position

puts "Task 1 final position: #{task1_final} (expected: 1)"
puts "Task 2 final position: #{task2_final} (expected: 2)"
puts "Task 3 final position: #{task3_final} (expected: ? - this is what we need to understand)"
puts "Task 3 original position was: 3"

puts "\nServer results: Task 1(#{task1_final}), Task 2(#{task2_final}), Task 3(#{task3_final})"
puts "Client predicted: Task 1(1), Task 2(2), Task 3(4)"
puts "Mismatch: Task 3 - client predicted 4, server actual #{task3_final}"