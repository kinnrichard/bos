job = Job.first
task = job.tasks.create!(title: "Test cache task", status: "new_task", position: 1)
puts "Task created with ID: #{task.id}"
