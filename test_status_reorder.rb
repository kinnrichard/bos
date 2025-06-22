# Test that tasks reorder when status changes
user = User.find_by(email: 'test@example.com')
job = Job.find(21)

# Find parent task B
parent_b = job.tasks.find_by(title: 'parent task B')
if parent_b
  puts "Parent task B id: #{parent_b.id}"

  # Get a non-cancelled subtask
  first_subtask = parent_b.subtasks.where.not(status: 'cancelled').first
  if first_subtask
    puts "\nBefore status change:"
    parent_b.subtasks.ordered_by_status.each do |st|
      puts "  #{st.title}: position #{st.position}, status #{st.status}"
    end

    puts "\nChanging '#{first_subtask.title}' to cancelled..."
    first_subtask.update!(status: 'cancelled')

    puts "\nAfter status change:"
    parent_b.subtasks.ordered_by_status.each do |st|
      puts "  #{st.title}: position #{st.position}, status #{st.status}"
    end
  else
    puts "No non-cancelled subtasks found"
  end
else
  puts "Parent task B not found"
end
