puts 'Testing detailed BEFORE positioning behavior...'

# Find a job with tasks
job = Job.joins(:tasks).first
if job.nil?
  puts 'No job with tasks found'
  exit
end

# Clear existing tasks and create exact scenario
job.tasks.destroy_all

# Create tasks with exact positions like in the user's scenario
task1 = job.tasks.create!(title: "Task 1", position: 1, parent_id: nil)
task3 = job.tasks.create!(title: "Task 3", position: 3, parent_id: nil)
task2 = job.tasks.create!(title: "Task 2", position: 1, parent_id: task3.id)

puts "\n=== Exact Initial State ==="
job.tasks.reload.order(:position).each do |t|
  parent_display = t.parent_id ? "#{t.parent_id[0..7]} (#{Task.find(t.parent_id).title})" : 'null'
  puts "#{t.title}: position #{t.position}, parent_id: #{parent_display}"
end

puts "\n=== Operation: task2.update!(parent_id: nil, position: { before: task3 }) ==="

# This is exactly what the server does when it receives before_task_id: task3
task2.update!(parent_id: nil, position: { before: task3 })

puts "\n=== Final State ==="
job.tasks.reload.order(:position).each do |t|
  parent_display = t.parent_id ? "#{t.parent_id[0..7]} (#{Task.find(t.parent_id).title})" : 'null'
  puts "#{t.title}: position #{t.position}, parent_id: #{parent_display}"
end

puts "\n=== Key Insight ==="
task2_final = task2.reload.position
task3_final = task3.reload.position
puts "Task 2 got position: #{task2_final}"
puts "Task 3 final position: #{task3_final}"
puts "Task 3 original position was: 3"
puts "Did positioning gem shift Task 3? #{task3_final != 3 ? 'YES' : 'NO'}"