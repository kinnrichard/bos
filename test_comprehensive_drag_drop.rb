# Clean up existing test data
Client.where(name: "Test Client DnD").destroy_all

# Find or create user
user = User.find_by(email: "test@example.com") || User.create!(
  name: "Test User",
  email: "test@example.com",
  password: "secret123",
  role: "admin"
)

# Ensure resort is enabled
user.update!(resort_tasks_on_status_change: true)

# Create client
client = Client.create!(
  name: "Test Client DnD",
  client_type: "residential"
)

# Create job
job = Job.create!(
  client: client,
  title: "Test Comprehensive Drag Drop",
  status: "open",
  priority: "normal",
  created_by: user
)

# Create parent task A
task_a = Task.create!(
  job: job,
  title: "Task A (Parent)",
  position: 1,
  status: "new_task"
)

# Create subtasks of A
task_a1 = Task.create!(
  job: job,
  title: "Task A.1 (Child of A)",
  position: 1,
  status: "new_task",
  parent_id: task_a.id
)

task_a2 = Task.create!(
  job: job,
  title: "Task A.2 (Child of A)",
  position: 2,
  status: "new_task",
  parent_id: task_a.id
)

# Create parent task B
task_b = Task.create!(
  job: job,
  title: "Task B (Parent)",
  position: 2,
  status: "new_task"
)

# Create subtask of B
task_b1 = Task.create!(
  job: job,
  title: "Task B.1 (Child of B)",
  position: 1,
  status: "new_task",
  parent_id: task_b.id
)

# Create standalone task C
task_c = Task.create!(
  job: job,
  title: "Task C (Will test various moves)",
  position: 3,
  status: "new_task"
)

# Create task with different status
task_d = Task.create!(
  job: job,
  title: "Task D (In Progress)",
  position: 4,
  status: "in_progress"
)

puts "\nTest data created!"
puts "Job URL: http://localhost:3000/clients/#{client.id}/jobs/#{job.id}"
puts "\nTest scenarios:"
puts "1. Drag Task C between A.1 and A.2 - should become child of A without animation dance"
puts "2. Drag Task C between Task A and Task B - should remain at root level"
puts "3. Drag B.1 to become child of A - should move without multiple animations"
puts "4. Drag A.1 to root level - should convert to root task"
puts "\nThe fix should prevent multiple resort animations when moving subtasks."
