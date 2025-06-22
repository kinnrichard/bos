# Direct test of the controller method
job = Job.find(21)
task = job.tasks.where(status: 'new_task').first || job.tasks.first
user = User.find_by(email: 'test@example.com')

puts "Testing TasksController directly"
puts "Job: #{job.title} (ID: #{job.id})"
puts "Task: #{task.title} (ID: #{task.id})"
puts "Current status: #{task.status}"
puts "-" * 50

# Create controller instance
controller = TasksController.new
controller.request = ActionDispatch::Request.new(Rack::MockRequest.env_for(
  "/clients/#{job.client_id}/jobs/#{job.id}/tasks/#{task.id}",
  method: 'PATCH'
))
controller.response = ActionDispatch::Response.new

# Set up request format
controller.request.headers['Accept'] = 'text/vnd.turbo-stream.html'
controller.request.headers['Content-Type'] = 'application/json'

# Mock current_user
allow_any_instance_of(TasksController).to receive(:current_user).and_return(user) rescue nil
controller.define_singleton_method(:current_user) { user }
controller.define_singleton_method(:authenticate_user!) { true }

# Set instance variables
controller.instance_variable_set(:@client, job.client)
controller.instance_variable_set(:@job, job)
controller.instance_variable_set(:@task, task)

# Call the render method directly
puts "\nCalling render_task_list_update..."
begin
  controller.send(:render_task_list_update)

  puts "Response status: #{controller.response.status}"
  puts "Response content type: #{controller.response.content_type}"

  if controller.response.content_type.include?('turbo-stream')
    puts "\n✓ Method returns Turbo Stream!"
    puts "\nTurbo Stream content:"
    puts "-" * 50
    puts controller.response.body
    puts "-" * 50
  else
    puts "\n✗ Method did NOT return Turbo Stream"
    puts "Response: #{controller.response.body[0..200]}"
  end
rescue => e
  puts "Error: #{e.message}"
  puts e.backtrace.first(5)
end

# Test the sorting service directly
puts "\n\nTesting TaskSortingService directly..."
sorting_service = TaskSortingService.new(job)
tasks_tree = sorting_service.get_ordered_tasks

puts "Tasks tree structure:"
tasks_tree.each_with_index do |node, i|
  task = node[:task]
  puts "#{i+1}. #{task.title} (status: #{task.status}, position: #{task.position})"
  if node[:subtasks].any?
    node[:subtasks].each do |subtask_node|
      st = subtask_node[:task]
      puts "   - #{st.title} (status: #{st.status}, position: #{st.position})"
    end
  end
end
