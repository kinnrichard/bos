puts 'Testing basic positioning functionality...'

# Create a test user without resort enabled
user = User.create!(
  name: 'Test User',
  email: "test#{rand(10000)}@example.com",
  role: :admin,
  password: 'password',
  resort_tasks_on_status_change: false
)

# Create a test job
job = Job.create!(
  title: 'Test Job',
  status: :open,
  priority: :low,
  client: Client.first,
  created_by: user
)

puts 'Created job: ' + job.title

# Create test tasks without user (to avoid reorder_by_status)
task1 = job.tasks.create!(title: 'Task 1', status: :new_task)
task2 = job.tasks.create!(title: 'Task 2', status: :new_task)
task3 = job.tasks.create!(title: 'Task 3', status: :new_task)

puts 'Created tasks with positions:'
puts "  Task 1: position #{task1.position}"
puts "  Task 2: position #{task2.position}"
puts "  Task 3: position #{task3.position}"

# Test position update using positioning gem API
puts "\nTesting position update..."
task1.update(position: 3)
puts "Task 1 position after update: #{task1.reload.position}"

# Clean up
job.destroy
user.destroy
puts 'Test completed successfully!'