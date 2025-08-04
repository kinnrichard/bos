#!/usr/bin/env ruby
# Test script for the Front API client workaround

require_relative 'lib/front_api_client'

# You'll need to set your AUTH_TOKEN
AUTH_TOKEN = ENV['FRONT_API_TOKEN'] || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzY29wZXMiOlsic2NpbSIsInByb3Zpc2lvbmluZyIsInByaXZhdGU6KiIsInNoYXJlZDoqIiwia2IiLCJhcHBfdHJpZ2dlciIsInRpbToxMjM2MDM1MCJdLCJpYXQiOjE3NTQyNjY3MDIsImlzcyI6ImZyb250Iiwic3ViIjoiMDkxYzUxNjAzZWUyNDExMzgzZWYiLCJqdGkiOiI4MDA4NjUzMWJmZGM4YzE2In0.Gn5Lpo0RLtl1-auPg9DDFfikINmPzXxPF8Xgsaz6PkA"

puts "Testing FrontApiClient..."
puts "=" * 50

client = FrontApiClient.new(auth_token: AUTH_TOKEN)

# Test 1: Get current user
puts "\n1. Testing me endpoint:"
begin
  user = client.me
  puts "✓ Current user: #{user['email']}"
rescue => e
  puts "✗ Error: #{e.message}"
end

# Test 2: Get inboxes
puts "\n2. Testing inboxes:"
begin
  inboxes = client.inboxes
  puts "✓ Found #{inboxes.length} inboxes"
  inboxes.first(3).each do |inbox|
    puts "  - #{inbox['name']} (#{inbox['id']})"
  end
rescue => e
  puts "✗ Error: #{e.message}"
end

# Test 3: Get conversations from specific inbox
inbox_id = "inb_fkroe"
puts "\n3. Testing conversations for inbox #{inbox_id}:"
begin
  conversations = client.get_inbox_conversations(inbox_id, limit: 10)
  puts "✓ Found #{conversations.length} conversations"

  if conversations.any?
    conv = conversations.first
    puts "  First conversation:"
    puts "    - ID: #{conv['id']}"
    puts "    - Subject: #{conv['subject']}"
    puts "    - Status: #{conv['status']}"
    puts "    - Created: #{conv['created_at']}"
  end
rescue => e
  puts "✗ Error: #{e.message}"
  puts e.backtrace.first(5).join("\n")
end

# Test 4: Get all conversations (limited)
puts "\n4. Testing all conversations:"
begin
  conversations = client.get_conversations(limit: 5)
  puts "✓ Found #{conversations.length} conversations"
rescue => e
  puts "✗ Error: #{e.message}"
end

puts "\n" + "=" * 50
puts "Test complete!"
