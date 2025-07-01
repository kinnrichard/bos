#!/usr/bin/env ruby

# Test script to verify cache invalidation behavior
# Run with: rails runner test_cache_invalidation.rb

puts "🧪 Testing Cache Invalidation Behavior"
puts "=" * 50

# Find a job with tasks
job = Job.includes(:tasks, :technicians).first
if job.nil?
  puts "❌ No jobs found. Create a job first."
  exit 1
end

puts "📋 Testing with Job: #{job.title} (ID: #{job.id})"
puts "   Initial updated_at: #{job.updated_at}"
puts "   Initial tasks: #{job.tasks.count}"
puts "   Initial technicians: #{job.technicians.count}"
puts

# Test 1: Task status change
puts "🔄 Test 1: Changing task status..."
if task = job.tasks.first
  original_time = job.updated_at
  old_status = task.status
  new_status = old_status == 'new_task' ? 'in_progress' : 'new_task'

  task.update!(status: new_status)
  job.reload

  if job.updated_at > original_time
    puts "   ✅ SUCCESS: Job touched after task status change"
    puts "   📊 Time change: #{original_time} → #{job.updated_at}"
  else
    puts "   ❌ FAILED: Job not touched after task status change"
  end
else
  puts "   ⚠️  SKIPPED: No tasks found"
end
puts

# Test 2: Task position change
puts "🔄 Test 2: Changing task position..."
if task = job.tasks.first
  original_time = job.updated_at
  old_position = task.position
  new_position = (old_position || 0) + 1

  sleep 0.1 # Ensure timestamp difference
  task.update!(position: new_position)
  job.reload

  if job.updated_at > original_time
    puts "   ✅ SUCCESS: Job touched after task position change"
    puts "   📊 Time change: #{original_time} → #{job.updated_at}"
  else
    puts "   ❌ FAILED: Job not touched after task position change"
  end
else
  puts "   ⚠️  SKIPPED: No tasks found"
end
puts

# Test 3: Technician assignment change
puts "🔄 Test 3: Changing technician assignment..."
original_time = job.updated_at
technician = User.where(role: [ 'technician', 'admin', 'owner' ]).first

if technician
  sleep 0.1 # Ensure timestamp difference

  if job.technicians.include?(technician)
    # Remove technician
    job.job_assignments.where(user: technician).destroy_all
    action = "removed"
  else
    # Add technician
    job.job_assignments.create!(user: technician)
    action = "added"
  end

  job.reload

  if job.updated_at > original_time
    puts "   ✅ SUCCESS: Job touched after technician #{action}"
    puts "   📊 Time change: #{original_time} → #{job.updated_at}"
  else
    puts "   ❌ FAILED: Job not touched after technician #{action}"
  end
else
  puts "   ⚠️  SKIPPED: No technician users found"
end
puts

# Test 4: HTTP ETag behavior simulation
puts "🔄 Test 4: Simulating HTTP ETag generation..."
require 'digest'

def simulate_etag(job, additional_keys = [])
  # Simulate Rails ETag generation
  etag_data = [ job.cache_key_with_version ] + additional_keys
  Digest::MD5.hexdigest(etag_data.join('-'))
end

original_etag = simulate_etag(job, [ 'include=technicians,tasks' ])
puts "   📋 Original ETag: #{original_etag}"

# Make a change
if task = job.tasks.first
  sleep 0.1
  task.update!(title: "#{task.title} (updated #{Time.current.strftime('%H:%M:%S')})")
  job.reload

  new_etag = simulate_etag(job, [ 'include=technicians,tasks' ])
  puts "   📋 New ETag: #{new_etag}"

  if original_etag != new_etag
    puts "   ✅ SUCCESS: ETag changed after task update"
  else
    puts "   ❌ FAILED: ETag unchanged after task update"
  end
end

puts
puts "🏁 Cache invalidation test complete!"
puts "   If all tests show ✅ SUCCESS, your cache invalidation is working correctly."
puts "   If any show ❌ FAILED, there are still cache invalidation issues."
