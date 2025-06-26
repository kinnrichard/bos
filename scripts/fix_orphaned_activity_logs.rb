#!/usr/bin/env ruby

# Script to fix ActivityLog records that have job_id but no client_id
# Run with: rails runner scripts/fix_orphaned_activity_logs.rb

puts "Starting to fix orphaned ActivityLog records..."
fixed_count = 0

# Fix Job logs that have job_id but no client_id
print "Fixing Job logs..."
ActivityLog.where(loggable_type: 'Job').where.not(job_id: nil).where(client_id: nil).find_each do |log|
  if job = Job.find_by(id: log.job_id)
    if job.client_id
      log.update_column(:client_id, job.client_id)
      fixed_count += 1
    end
  end
end
puts " done."

# Fix other logs that have job_id but no client_id (Tasks, etc.)
print "Fixing other logs with job_id..."
ActivityLog.where.not(job_id: nil).where(client_id: nil).find_each do |log|
  if job = Job.find_by(id: log.job_id)
    if job.client_id
      log.update_column(:client_id, job.client_id)
      fixed_count += 1
    end
  end
end
puts " done."

# Fix Task logs that have no job_id or client_id but the task has a job
print "Fixing Task logs without job/client associations..."
ActivityLog.where(loggable_type: 'Task', job_id: nil).find_each do |log|
  if log.loggable && log.loggable.job
    updates = {}
    updates[:job_id] = log.loggable.job_id if log.job_id.nil?
    updates[:client_id] = log.loggable.job.client_id if log.client_id.nil? && log.loggable.job.client_id

    if updates.any?
      log.update_columns(updates)
      fixed_count += 1
    end
  end
end
puts " done."

puts "\nFixed #{fixed_count} orphaned ActivityLog records."
puts "Total logs with job_id but no client_id remaining: #{ActivityLog.where.not(job_id: nil).where(client_id: nil).count}"
