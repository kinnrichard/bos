# Create test data for drag and drop
user = User.find_by(email: 'test@example.com')
client = Client.create!(name: 'Drag Test Complex', client_type: 'residential')
job = Job.create!(
  client: client,
  title: 'Complex Subtask Test',
  status: 'open',
  priority: 'normal',
  created_by: user
)

# Create Parent Task with 3 subtasks
parent = Task.create!(job: job, title: 'Parent Task', status: 'new_task', position: 1)
sub1 = Task.create!(job: job, parent: parent, title: 'Subtask 1', status: 'new_task', position: 1)
sub2 = Task.create!(job: job, parent: parent, title: 'Subtask 2', status: 'new_task', position: 2)
sub3 = Task.create!(job: job, parent: parent, title: 'Subtask 3', status: 'new_task', position: 3)

# Create standalone task
standalone = Task.create!(job: job, title: 'Will become Subtask 2.5', status: 'new_task', position: 2)

puts job.id
puts client.id
