# Clean up existing test data (skip user if exists)
Client.where(name: "Test Client DnD").destroy_all

# Find or create user
user = User.find_by(email: "test@example.com") || User.create!(
  name: "Test User",
  email: "test@example.com",
  password: "secret123",
  role: "admin"
)

# Create client
client = Client.create!(
  name: "Test Client DnD",
  client_type: "residential"
)

# Create job
job = Job.create!(
  client: client,
  title: "Test Drag Drop Nesting",
  status: "open",
  priority: "normal",
  created_by: user
)

# Create parent task B
task_b = Task.create!(
  job: job,
  title: "Task B (Parent)",
  position: 1,
  status: "new_task"
)

# Create child task A of B
task_a = Task.create!(
  job: job,
  title: "Task A (Child of B)",
  position: 1,
  status: "new_task",
  parent_id: task_b.id
)

# Create root task C
task_c = Task.create!(
  job: job,
  title: "Task C (Will become child)",
  position: 2,
  status: "new_task"
)

puts "Created job: #{job.id}, client: #{client.id}"
puts "Task B id: #{task_b.id}"
puts "Task A id: #{task_a.id} (child of B)"
puts "Task C id: #{task_c.id}"
