#!/usr/bin/env ruby
require 'net/http'
require 'json'
require 'uri'

# Create test data via Rails console
puts "Creating test data..."
system(<<~RUBY)
  rails runner '
    # Clean up existing test data
    User.where(email: "test@example.com").destroy_all
    Client.where(name: "Test Client DnD").destroy_all
    
    # Create user
    user = User.create!(
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
  '
RUBY

puts "\nTest data created successfully!"
puts "\nTo test the fix:"
puts "1. Go to http://localhost:3000"
puts "2. Sign in with: test@example.com / secret123"
puts "3. Navigate to Clients > Test Client DnD > Test Drag Drop Nesting"
puts "4. You should see:"
puts "   - Task B (Parent)"
puts "     - Task A (Child of B)"
puts "   - Task C (Will become child)"
puts "5. Drag 'Task C' between Task B and Task A"
puts "6. After dropping, all tasks should remain properly nested:"
puts "   - Task B (Parent)"
puts "     - Task C (Will become child)"
puts "     - Task A (Child of B)"
puts "\nThe bug was that after dropping, the tasks would appear un-nested until page reload."
puts "With the fix, they should remain properly nested immediately after dropping."