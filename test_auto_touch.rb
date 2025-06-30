#!/usr/bin/env ruby

# Test script to verify auto-touch functionality
# Run with: rails runner test_auto_touch.rb

puts "🧪 Testing Auto-Touch Functionality"
puts "=" * 50

# Test that existing models work with new auto-touch
job = Job.first
if job.nil?
  puts "❌ No jobs found. Create a job first."
  exit 1
end

puts "📋 Testing with Job: #{job.title} (ID: #{job.id})"

# Check if Task model now auto-touches job
task_reflection = Task.reflect_on_association(:job)
if task_reflection&.options&.dig(:touch)
  puts "✅ Task#job has touch: true (auto-configured)"
else
  puts "❌ Task#job missing touch: true"
end

# Check if JobAssignment model auto-touches job
assignment_reflection = JobAssignment.reflect_on_association(:job)
if assignment_reflection&.options&.dig(:touch)
  puts "✅ JobAssignment#job has touch: true"
else
  puts "❌ JobAssignment#job missing touch: true"
end

# Check if JobPerson model auto-touches job
person_reflection = JobPerson.reflect_on_association(:job)
if person_reflection&.options&.dig(:touch)
  puts "✅ JobPerson#job has touch: true"
else
  puts "❌ JobPerson#job missing touch: true"
end

puts
puts "🔍 Checking touchable associations for existing models:"

# Test touchable instance methods
if job.tasks.any?
  task = job.tasks.first
  puts "Task touchable associations: #{task.touchable_associations}"
  puts "Task will touch job?: #{task.will_touch?(:job)}"
end

if job.job_assignments.any?
  assignment = job.job_assignments.first
  puts "JobAssignment touchable associations: #{assignment.touchable_associations}"
  puts "JobAssignment will touch job?: #{assignment.will_touch?(:job)}"
end

puts
puts "🏁 Auto-touch functionality test complete!"
