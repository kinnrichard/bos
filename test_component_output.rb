# Test the Phlex component output directly
job = Job.find(31)
sorting_service = TaskSortingService.new(job)
tasks_tree = sorting_service.get_ordered_tasks

puts "Testing Phlex component output"
puts "Job: #{job.title}"
puts "Tasks count: #{tasks_tree.size}"
puts "-" * 50

# Create the component and get HTML
component = Views::Tasks::ListComponent.new(job: job, tasks_tree: tasks_tree)
html_content = component.call

puts "HTML length: #{html_content.length}"

# Create Turbo Stream manually
turbo_stream_html = <<~HTML
  <turbo-stream action="update" target="tasks-list">
    <template>
      #{html_content}
    </template>
  </turbo-stream>
HTML

puts "\nFirst 500 chars of Turbo Stream:"
puts turbo_stream_html[0..500]
puts "..."

# Check for problematic characters
if turbo_stream_html.include?('&#39;')
  puts "\n⚠️  Contains HTML entity &#39; (apostrophe)"
end

if turbo_stream_html.include?('&amp;')
  puts "⚠️  Contains HTML entity &amp; (ampersand)"
end

if turbo_stream_html.scan(/&(?!amp;|lt;|gt;|quot;|#\d+;|#x[0-9a-fA-F]+;)/).any?
  puts "⚠️  Contains unescaped & characters"
end

# Check specific problematic content
if html_content.include?('doesn&#39;t')
  puts "\n⚠️  Found HTML-encoded apostrophe in 'doesn't'"
  puts "This might cause JavaScript parsing issues"
end

# Save to file for inspection
File.write('turbo_stream_output.html', turbo_stream_html)
puts "\nFull output saved to turbo_stream_output.html"
