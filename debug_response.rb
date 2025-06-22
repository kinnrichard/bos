# Test what the actual response looks like
job = Job.find(31)
task = job.tasks.find(145)

puts "Testing response for task: #{task.title}"
puts "Current status: #{task.status}"
puts "-" * 50

# Test the controller directly
controller = TasksController.new
controller.request = ActionDispatch::Request.new(Rack::MockRequest.env_for(
  "/clients/#{job.client_id}/jobs/#{job.id}/tasks/#{task.id}",
  method: 'PATCH'
))
controller.response = ActionDispatch::Response.new

# Set up request
controller.request.headers['Accept'] = 'text/vnd.turbo-stream.html, application/json'
controller.request.headers['Content-Type'] = 'application/json'

# Mock current_user
user = User.find_by(email: 'test@example.com')
controller.define_singleton_method(:current_user) { user }
controller.define_singleton_method(:authenticate_user!) { true }

# Set instance variables
controller.instance_variable_set(:@client, job.client)
controller.instance_variable_set(:@job, job)
controller.instance_variable_set(:@task, task)

# Update the task
task.update!(status: 'new_task')

# Call render_task_list_update
begin
  controller.send(:render_task_list_update)

  puts "Response status: #{controller.response.status}"
  puts "Response content-type: #{controller.response.content_type}"
  puts "\nResponse body:"
  puts "-" * 50
  puts controller.response.body
  puts "-" * 50

  # Check if it's valid
  if controller.response.body.include?('<turbo-stream')
    puts "\n✓ Response contains turbo-stream element"

    # Check for HTML entities that might break parsing
    if controller.response.body.include?('&') && !controller.response.body.include?('&amp;')
      puts "⚠️  Response contains unescaped & characters"
    end

    if controller.response.body.include?('<') && controller.response.body.include?('&lt;')
      puts "⚠️  Response contains HTML entities that might break parsing"
    end
  else
    puts "\n✗ Response does not contain turbo-stream element"
  end
rescue => e
  puts "Error: #{e.message}"
  puts e.backtrace.first(5)
end
