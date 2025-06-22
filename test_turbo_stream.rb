# Test Turbo Stream response from tasks controller
require 'net/http'
require 'uri'
require 'json'

# First, let's get the job and a task
job = Job.find(21)
task = job.tasks.first

puts "Testing task status update with Turbo Stream..."
puts "Task: #{task.title}"
puts "Current status: #{task.status}"

# Simulate a request with Turbo Stream headers
uri = URI("http://localhost:3000/clients/#{job.client_id}/jobs/#{job.id}/tasks/#{task.id}")
http = Net::HTTP.new(uri.host, uri.port)

# Get CSRF token (normally from the form)
# For testing, we'll use Rails console to simulate
puts "\nTo test the Turbo Stream response, run this curl command:"
puts <<~CURL
curl -X PATCH http://localhost:3000/clients/#{job.client_id}/jobs/#{job.id}/tasks/#{task.id} \\
  -H "Accept: text/vnd.turbo-stream.html" \\
  -H "Content-Type: application/json" \\
  -d '{"task": {"status": "in_progress"}}' \\
  -c cookies.txt
CURL

puts "\nOr in Rails console:"
puts <<~RUBY
app.patch "/clients/#{job.client_id}/jobs/#{job.id}/tasks/#{task.id}",#{' '}
  params: { task: { status: "in_progress" } },
  headers: { "Accept" => "text/vnd.turbo-stream.html" }
puts app.response.body
RUBY
