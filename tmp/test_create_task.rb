job = Job.first
task = job.tasks.create!(title: 'Test positioning', status: :new_task)
puts 'Created task with position: ' + task.position.to_s
task.destroy
puts 'Test completed successfully!'