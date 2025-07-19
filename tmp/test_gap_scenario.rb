puts 'Testing scenario with position gap...'

# Find a job with tasks
job = Job.joins(:tasks).first
if job.nil?
  puts 'No job with tasks found'
  exit
end

# Clear existing tasks and recreate with gap as shown in logs
job.tasks.destroy_all

# Create tasks with exact positions from user logs (note the gap at position 2)
task1 = job.tasks.create!(title: "Task 1", position: 1, parent_id: nil)
task3 = job.tasks.create!(title: "Task 3", position: 3, parent_id: nil)  # Gap at position 2
task2 = job.tasks.create!(title: "Task 2", position: 1, parent_id: task3.id)

puts "\n=== Initial State with Gap (matching user logs) ==="
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
task3_final = task3.reload.position
puts "Task 3 moved from position 3 to position #{task3_final}"
puts "This shows how positioning gem handles gaps in positions"

if task3_final == 3
  puts "🔍 INSIGHT: positioning gem filled the gap at position 2, Task 3 stayed at 3"
elsif task3_final == 4
  puts "🔍 INSIGHT: positioning gem shifted Task 3 from 3 to 4 (normal shifting)"
else
  puts "🔍 INSIGHT: unexpected behavior - Task 3 went to position #{task3_final}"
end