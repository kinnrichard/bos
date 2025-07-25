---
issue_id: ISS-0017
title: Optimize TaskSortingService for hierarchy deletion performance
description: Optional performance optimization for TaskSortingService when dealing with large task hierarchies and calculated ancestor properties
status: open
priority: low
assignee: unassigned
created_date: 2025-07-21T18:30:00.000Z
updated_date: 2025-07-21T18:30:00.000Z
estimated_hours: 6
actual_hours: 0
tags:
  - backend
  - performance
  - optimization
  - service
epic_id: EP-0006
sprint: null
completion_percentage: 0
---

# Optimize TaskSortingService for Hierarchy Deletion Performance

## Overview
This optional performance optimization addresses potential bottlenecks in TaskSortingService when dealing with large task hierarchies and the new `has_discarded_ancestor` calculated property. Only implement if performance testing reveals issues with the basic implementation.

## When to Implement

### Performance Triggers
Implement this optimization only if any of these conditions are met:
- Task list API responses take >500ms with hierarchies >100 tasks
- Database CPU usage increases significantly after hierarchy deletion implementation  
- User reports noticeable delays when viewing large task lists
- Load testing reveals unacceptable response times

### Success Criteria for Current Implementation
**Do NOT implement this optimization if:**
- Task list loads remain <200ms for typical use cases (50-100 tasks)
- Database performance remains stable
- No user complaints about task list performance
- Memory usage remains acceptable

## Potential Optimizations

### 1. Query-Level Optimization

#### Current Approach Issues
The current implementation may cause N+1 queries when serializing tasks with `has_discarded_ancestor`:

```ruby
# Potential N+1 issue
tasks.each do |task|
  task.has_discarded_ancestor  # Could trigger separate query for each task
end
```

#### Optimized Query Solution
```ruby
# In TaskSortingService
class TaskSortingService
  def self.fetch_with_ancestor_info(scope = Task.all)
    # Use recursive CTE to calculate ancestor information in database
    scope.with(
      RECURSIVE: {
        task_ancestors: [
          # Base case: root tasks
          scope.select(:id, :parent_id, :discarded_at, 'false as has_discarded_ancestor')
               .where(parent_id: nil),
          
          # Recursive case: add children with ancestor info
          scope.select(
            'tasks.id',
            'tasks.parent_id', 
            'tasks.discarded_at',
            'CASE WHEN task_ancestors.discarded_at IS NOT NULL OR task_ancestors.has_discarded_ancestor THEN true ELSE false END as has_discarded_ancestor'
          ).joins('JOIN task_ancestors ON task_ancestors.id = tasks.parent_id')
        ]
      }
    ).joins('LEFT JOIN task_ancestors ON task_ancestors.id = tasks.id')
  end
end
```

### 2. Caching Strategy

#### Request-Level Memoization
```ruby
# In Task model
def has_discarded_ancestor
  return @has_discarded_ancestor if defined?(@has_discarded_ancestor)
  
  @has_discarded_ancestor = calculate_has_discarded_ancestor
end

private

def calculate_has_discarded_ancestor
  return false unless parent_id
  
  # Implementation as before...
end
```

#### Service-Level Batch Processing
```ruby
class TaskSortingService
  def self.precompute_ancestor_info(tasks)
    # Build ancestor map to avoid repeated traversals
    ancestor_map = {}
    
    # Sort by depth (parents before children) to process efficiently
    sorted_tasks = tasks.sort_by { |t| calculate_depth(t) }
    
    sorted_tasks.each do |task|
      ancestor_map[task.id] = calculate_ancestor_info(task, ancestor_map)
    end
    
    ancestor_map
  end
end
```

### 3. Database Index Optimization

#### Recommended Indexes
```ruby
# Migration for performance optimization
class AddTaskHierarchyIndexes < ActiveRecord::Migration[7.0]
  def change
    # Optimize parent_id lookups
    add_index :tasks, [:parent_id, :discarded_at]
    
    # Optimize hierarchy traversal
    add_index :tasks, :parent_id, where: 'discarded_at IS NULL'
    add_index :tasks, :discarded_at, where: 'discarded_at IS NOT NULL'
    
    # Composite index for common queries
    add_index :tasks, [:job_id, :parent_id, :discarded_at]
  end
end
```

### 4. Materialized Path Approach

#### If Hierarchies Become Very Large
For very large, deep hierarchies, consider materialized path:

```ruby
# Migration to add materialized path
class AddMaterializedPathToTasks < ActiveRecord::Migration[7.0]
  def change
    add_column :tasks, :path, :string
    add_column :tasks, :depth, :integer, default: 0
    
    add_index :tasks, :path
    add_index :tasks, [:depth, :discarded_at]
  end
end

# In Task model
class Task < ApplicationRecord
  before_save :update_path
  after_save :update_descendant_paths
  
  def has_discarded_ancestor
    return false if path.blank?
    
    # Check if any ancestor ID in path corresponds to discarded task
    ancestor_ids = path.split('/')[0..-2]  # Exclude self
    return false if ancestor_ids.empty?
    
    Task.where(id: ancestor_ids).exists?(discarded_at: !nil)
  end
  
  private
  
  def update_path
    if parent_id.present?
      parent_path = parent.path || parent.id.to_s
      self.path = "#{parent_path}/#{id}"
      self.depth = parent_path.count('/') + 1
    else
      self.path = id.to_s
      self.depth = 0
    end
  end
end
```

## Implementation Plan

### Phase 1: Performance Analysis
1. **Establish Baselines**: Measure current performance with various hierarchy sizes
2. **Identify Bottlenecks**: Use database profiling to find slow queries
3. **Load Testing**: Simulate realistic usage patterns
4. **Memory Profiling**: Monitor memory usage during task list operations

### Phase 2: Query Optimization (If Needed)
1. **Implement Recursive CTE**: Move ancestor calculation to database level
2. **Add Strategic Indexes**: Optimize common query patterns
3. **Batch Processing**: Process multiple tasks efficiently in services

### Phase 3: Caching Strategy (If Needed)  
1. **Request-Level Caching**: Memoize calculations within request lifecycle
2. **Application-Level Caching**: Cache expensive hierarchy calculations
3. **Cache Invalidation**: Properly invalidate when hierarchy changes

### Phase 4: Advanced Optimizations (Only If Critical)
1. **Materialized Path**: For very deep hierarchies (>10 levels)
2. **Background Processing**: Pre-calculate expensive operations
3. **Database Triggers**: Use database-level optimizations

## Performance Benchmarks

### Target Performance Goals
- API responses <200ms for 100-task hierarchies
- Database queries <50ms for ancestor calculations
- Memory usage increase <20% compared to baseline
- No user-perceivable delays in task list rendering

### Benchmarking Script
```ruby
# benchmark/task_hierarchy_performance.rb
require 'benchmark'

def create_hierarchy(depth, breadth)
  tasks = []
  queue = [nil]  # Start with root level
  
  depth.times do |level|
    current_level = []
    queue.each do |parent|
      breadth.times do
        task = Task.create!(
          name: "Task L#{level}",
          parent: parent,
          job: Job.first,
          status: 'pending'
        )
        tasks << task
        current_level << task
      end
    end
    queue = current_level
  end
  
  tasks
end

# Test various hierarchy sizes
[
  [5, 5],    # 5 levels, 5 children each
  [3, 20],   # 3 levels, 20 children each
  [10, 2],   # 10 levels, 2 children each (deep)
  [6, 10]    # 6 levels, 10 children each (balanced)
].each do |depth, breadth|
  puts "\n=== Testing #{depth} levels, #{breadth} children each ==="
  
  tasks = create_hierarchy(depth, breadth)
  total_tasks = tasks.count
  
  # Benchmark current implementation
  time = Benchmark.measure do
    TaskSerializer.new(tasks).serializable_hash
  end
  
  puts "Total tasks: #{total_tasks}"
  puts "Serialization time: #{(time.real * 1000).round(2)}ms"
  puts "Time per task: #{(time.real / total_tasks * 1000).round(2)}ms"
  
  # Clean up
  Task.where(id: tasks.map(&:id)).delete_all
end
```

### Performance Monitoring
```ruby
# Add to TaskSortingService for monitoring
class TaskSortingService
  def self.fetch_sorted_tasks(*args)
    start_time = Time.current
    result = fetch_sorted_tasks_impl(*args)
    end_time = Time.current
    
    # Log performance metrics
    if (end_time - start_time) > 0.2  # Log if >200ms
      Rails.logger.warn(
        "Slow task sorting: #{(end_time - start_time) * 1000}ms for #{result.count} tasks"
      )
    end
    
    result
  end
end
```

## Testing Strategy

### Performance Tests
```ruby
class TaskSortingPerformanceTest < ActiveSupport::TestCase
  test "hierarchy deletion performance remains acceptable" do
    # Create realistic hierarchy
    tasks = create_complex_hierarchy(100)
    
    # Measure baseline performance
    baseline = Benchmark.measure do
      TaskSerializer.new(tasks.first(50)).serializable_hash
    end
    
    # Delete some parent tasks
    tasks.first(5).each { |t| t.update!(discarded_at: Time.current) }
    
    # Measure performance with deleted ancestors
    optimized = Benchmark.measure do
      TaskSerializer.new(tasks.last(50)).serializable_hash
    end
    
    # Performance should not degrade significantly
    performance_ratio = optimized.real / baseline.real
    assert_operator performance_ratio, :<, 1.5, "Performance degraded too much: #{performance_ratio}x slower"
  end
end
```

### Load Testing
```ruby
# Use with rails performance testing gems
test "handles concurrent hierarchy requests" do
  tasks = create_hierarchy(5, 10)
  
  threads = 10.times.map do
    Thread.new do
      100.times do
        TaskSerializer.new(tasks.sample(20)).serializable_hash
      end
    end
  end
  
  start_time = Time.current
  threads.each(&:join)
  total_time = Time.current - start_time
  
  assert_operator total_time, :<, 30, "Concurrent requests took too long: #{total_time}s"
end
```

## Implementation Decision Matrix

| Scenario | Recommended Optimization | Complexity | Impact |
|----------|-------------------------|------------|---------|
| <100 tasks, <5 levels | No optimization needed | - | - |
| 100-500 tasks, 5-8 levels | Query optimization + indexes | Medium | High |
| 500-1000 tasks, 8-10 levels | + Caching strategy | Medium | High |
| >1000 tasks, >10 levels | + Materialized path | High | Very High |

## Definition of Done

**This issue is complete when:**
- [ ] Performance benchmarks establish if optimization is needed
- [ ] If needed, chosen optimization strategy is implemented
- [ ] Performance tests confirm improvements meet target goals
- [ ] No regressions in existing functionality
- [ ] Documentation updated with performance characteristics
- [ ] Monitoring added to detect future performance issues

**If optimization not needed:**
- [ ] Benchmarks confirm current implementation meets performance targets
- [ ] Issue closed as "won't implement"
- [ ] Performance baselines documented for future reference

## Dependencies

- **Depends on**: ISS-0013, ISS-0014, ISS-0015 (core implementation must be complete)
- **Optional**: Only implement if performance issues are identified

## Related Issues
This optional optimization supports EP-0006 but is not required for epic completion.