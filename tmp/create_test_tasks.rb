puts 'Creating test tasks...'

job = Job.first
if job.nil?
  puts 'No job found'
  exit
end

# Create test tasks
task1 = job.tasks.create!(title: 'Test Task 1', status: :new_task)
task2 = job.tasks.create!(title: 'Test Task 2', status: :new_task)  
task3 = job.tasks.create!(title: 'Test Task 3', status: :new_task)

puts "Created tasks:"
puts "  #{task1.title}: position #{task1.position}"
puts "  #{task2.title}: position #{task2.position}"
puts "  #{task3.title}: position #{task3.position}"

puts "\nTest 1: Moving Task 3 to after Task 1"
task3.update(position: { after: task1 })

job.tasks.reload
puts "After moving Task 3 after Task 1:"
[task1, task2, task3].each do |task|
  task.reload
  puts "  #{task.title}: position #{task.position}"
end

puts "\nTest 2: Moving Task 2 to first position"
task2.update(position: :first)

job.tasks.reload
puts "After moving Task 2 to first:"
[task1, task2, task3].each do |task|
  task.reload
  puts "  #{task.title}: position #{task.position}"
end

# Clean up
task1.destroy
task2.destroy
task3.destroy

puts "\n✅ Relative positioning tests completed successfully!"