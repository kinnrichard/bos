# Test the Turbo Stream response directly
job = Job.find(21)
task = job.tasks.where(status: 'new_task').first || job.tasks.first

puts "Testing Turbo Stream response"
puts "Task: #{task.title} (#{task.status})"
puts "-" * 50

# Update task status
old_status = task.status
task.update!(status: 'in_progress')

# Create controller instance to test render method
controller = TasksController.new
controller.instance_variable_set(:@job, job)
controller.instance_variable_set(:@task, task)

# Mock the turbo_stream helper
class MockTurboStream
  def update(target, content)
    "<turbo-stream action=\"update\" target=\"#{target}\"><template>#{content}</template></turbo-stream>"
  end
end

controller.define_singleton_method(:turbo_stream) { MockTurboStream.new }

# Call the render method
begin
  result = controller.send(:render_task_list_update)
  puts "\nTurbo Stream response:"
  puts result
rescue => e
  puts "Error: #{e.message}"
  puts e.backtrace.first(5)
end

# Check task order
puts "\n\nTask order after status change:"
job.tasks.root_tasks.ordered_by_status.each_with_index do |t, i|
  puts "#{i+1}. #{t.title} (#{t.status})"
end

# Reset task status
task.update!(status: old_status)
