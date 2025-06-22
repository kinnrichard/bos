# Debug script to test Turbo Stream response
require 'net/http'
require 'uri'
require 'json'

# Get a test task
job = Job.find(21)
task = job.tasks.where(status: 'new_task').first || job.tasks.first
user = User.find_by(email: 'test@example.com')

puts "Testing Turbo Stream response for task status change"
puts "Job: #{job.title} (ID: #{job.id})"
puts "Task: #{task.title} (ID: #{task.id})"
puts "Current status: #{task.status}"
puts "User resort setting: #{user.resort_tasks_on_status_change}"
puts "-" * 50

# Simulate a request in Rails console
puts "\nSimulating request with Rails test helpers..."

# Create a test request
app = ActionDispatch::Integration::Session.new(Rails.application)

# Sign in
app.post '/users/sign_in', params: { user: { email: 'test@example.com', password: 'testpassword' } }
puts "Sign in response: #{app.response.status}"

# Make request with Turbo Stream accept header
puts "\nMaking PATCH request with Turbo Stream accept header..."
app.patch "/clients/#{job.client_id}/jobs/#{job.id}/tasks/#{task.id}",
  params: { task: { status: "in_progress" } },
  headers: {
    "Accept" => "text/vnd.turbo-stream.html",
    "Content-Type" => "application/json"
  }

puts "Response status: #{app.response.status}"
puts "Response content type: #{app.response.content_type}"
puts "Response headers: #{app.response.headers.select { |k, v| k.include?('Content') }}"

if app.response.content_type.include?('turbo-stream')
  puts "\n✓ Server returned Turbo Stream response!"
  puts "\nTurbo Stream content:"
  puts "-" * 50
  puts app.response.body
  puts "-" * 50

  # Check if it contains an update action
  if app.response.body.include?('turbo-stream action="update"')
    puts "\n✓ Contains update action"
  end

  if app.response.body.include?('tasks-list')
    puts "✓ Targets tasks-list element"
  end
else
  puts "\n✗ Server did NOT return Turbo Stream response"
  puts "Response body preview:"
  puts app.response.body[0..500]
end

# Check if task was actually updated
task.reload
puts "\nTask status after request: #{task.status}"

# Check task ordering
puts "\nTask positions in parent scope:"
if task.parent_id
  task.parent.subtasks.ordered_by_status.each do |t|
    puts "  #{t.title}: status=#{t.status}, position=#{t.position}"
  end
else
  job.tasks.root_tasks.ordered_by_status.each do |t|
    puts "  #{t.title}: status=#{t.status}, position=#{t.position}"
  end
end
