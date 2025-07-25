---
issue_id: ISS-0013
title: Add has_discarded_ancestor method to Task model
description: Implement calculated property method in Task model to determine if any ancestor in the hierarchy is discarded
status: open
priority: high
assignee: unassigned
created_date: 2025-07-21T18:30:00.000Z
updated_date: 2025-07-21T18:30:00.000Z
estimated_hours: 6
actual_hours: 0
tags:
  - backend
  - model
  - hierarchy
  - logic
epic_id: EP-0006
sprint: null
completion_percentage: 0
---

# Add has_discarded_ancestor Method to Task Model

## Overview
Implement a calculated property method in the Task model that efficiently determines if any ancestor in the task hierarchy is discarded. This method will be used to hide descendants of deleted tasks from normal task lists while preserving their individual states.

## Requirements

### Method Implementation
Create instance method `has_discarded_ancestor` in `app/models/task.rb`:

```ruby
def has_discarded_ancestor
  return false unless parent_id
  
  # Traverse up the hierarchy checking for discarded ancestors
  current_parent = parent
  while current_parent
    return true if current_parent.discarded_at.present?
    current_parent = current_parent.parent
  end
  
  false
end
```

### Performance Considerations
1. **Efficient Traversal**: Use iterative approach to avoid stack overflow with deep hierarchies
2. **Early Termination**: Return immediately when first discarded ancestor found
3. **Null Safety**: Handle cases where parent relationships may be broken
4. **Query Optimization**: Consider preloading parent relationships when calling on collections

### Edge Cases to Handle
1. **Orphaned Tasks**: Tasks with parent_id but no actual parent record
2. **Root Tasks**: Tasks without parent_id (should return false)
3. **Circular References**: Tasks that somehow reference themselves in hierarchy (add safety check)
4. **Deep Hierarchies**: Ensure performance with 10+ levels of nesting

## Acceptance Criteria

### Functional Requirements
- [ ] Method returns `false` for root tasks (no parent_id)
- [ ] Method returns `false` when no ancestors are discarded
- [ ] Method returns `true` when immediate parent is discarded
- [ ] Method returns `true` when any ancestor in chain is discarded
- [ ] Method handles orphaned tasks gracefully (missing parent record)

### Performance Requirements
- [ ] Method completes in <10ms for hierarchies up to 10 levels deep
- [ ] No N+1 query issues when called on task collections
- [ ] Memory usage remains constant regardless of hierarchy depth

### Safety Requirements
- [ ] No infinite loops with circular references
- [ ] Graceful handling of nil parent relationships
- [ ] Proper exception handling for database errors

## Implementation Details

### Core Method Structure
```ruby
def has_discarded_ancestor
  return false unless parent_id
  
  visited_ids = Set.new([id])  # Prevent circular references
  current_parent = parent
  
  while current_parent
    # Safety check for circular references
    return false if visited_ids.include?(current_parent.id)
    visited_ids.add(current_parent.id)
    
    return true if current_parent.discarded_at.present?
    current_parent = current_parent.parent
  end
  
  false
rescue ActiveRecord::RecordNotFound
  # Handle orphaned tasks gracefully
  false
end
```

### Optimization Considerations
If performance becomes an issue with large datasets, consider:

1. **Memoization**: Cache results during request lifecycle
2. **Database-level Traversal**: Use recursive SQL queries
3. **Materialized Paths**: Store ancestor paths for O(1) lookup
4. **Background Calculation**: Pre-calculate and store as attribute

## Testing Requirements

### Unit Tests (`test/models/task_test.rb`)

#### Basic Functionality Tests
```ruby
test "has_discarded_ancestor returns false for root task" do
  root_task = create(:task, parent: nil)
  assert_not root_task.has_discarded_ancestor
end

test "has_discarded_ancestor returns false when no ancestors are discarded" do
  parent = create(:task)
  child = create(:task, parent: parent)
  grandchild = create(:task, parent: child)
  
  assert_not grandchild.has_discarded_ancestor
end

test "has_discarded_ancestor returns true when immediate parent is discarded" do
  parent = create(:task, discarded_at: Time.current)
  child = create(:task, parent: parent)
  
  assert child.has_discarded_ancestor
end

test "has_discarded_ancestor returns true when grandparent is discarded" do
  grandparent = create(:task, discarded_at: Time.current)
  parent = create(:task, parent: grandparent)
  child = create(:task, parent: parent)
  
  assert child.has_discarded_ancestor
end
```

#### Edge Case Tests
```ruby
test "has_discarded_ancestor handles orphaned tasks" do
  task = create(:task)
  task.update_column(:parent_id, 999999)  # Non-existent parent
  
  assert_not task.has_discarded_ancestor
end

test "has_discarded_ancestor handles circular references" do
  parent = create(:task)
  child = create(:task, parent: parent)
  parent.update_column(:parent_id, child.id)  # Create circular reference
  
  assert_not child.has_discarded_ancestor
end

test "has_discarded_ancestor handles deep hierarchies" do
  tasks = []
  10.times do |i|
    tasks << create(:task, parent: tasks[i-1])
  end
  
  tasks.first.update!(discarded_at: Time.current)
  assert tasks.last.has_discarded_ancestor
end
```

#### Performance Tests
```ruby
test "has_discarded_ancestor performs efficiently with deep hierarchy" do
  tasks = []
  20.times do |i|
    tasks << create(:task, parent: tasks[i-1])
  end
  
  assert_performance_faster_than(0.01) do  # 10ms limit
    tasks.last.has_discarded_ancestor
  end
end
```

## Performance Benchmarking

### Benchmark Script
Create benchmark to measure performance with various hierarchy depths:

```ruby
# Run in Rails console
require 'benchmark'

def create_hierarchy(depth)
  tasks = []
  depth.times do |i|
    tasks << Task.create!(
      name: "Task #{i}",
      parent: tasks[i-1],
      status: 'pending',
      job: Job.first
    )
  end
  tasks
end

[5, 10, 15, 20].each do |depth|
  tasks = create_hierarchy(depth)
  
  time = Benchmark.measure do
    100.times { tasks.last.has_discarded_ancestor }
  end
  
  puts "Depth #{depth}: #{(time.real / 100 * 1000).round(2)}ms per call"
  
  Task.where(id: tasks.map(&:id)).delete_all
end
```

## Integration Considerations

### TaskSerializer Integration
Once method is implemented, TaskSerializer will need to include it:

```ruby
# In app/serializers/task_serializer.rb
attribute :has_discarded_ancestor
```

### Query Optimization
Consider adding to Task model for efficient bulk operations:

```ruby
scope :with_preloaded_ancestors, -> { includes(:parent) }

# Usage when calculating for many tasks:
tasks.with_preloaded_ancestors.each(&:has_discarded_ancestor)
```

## Definition of Done

- [ ] Method implemented in Task model with proper error handling
- [ ] All unit tests written and passing
- [ ] Performance benchmarks confirm <10ms execution time
- [ ] Edge cases handled appropriately
- [ ] Code reviewed and approved
- [ ] No existing functionality broken
- [ ] Documentation added to method with examples

## Related Issues
This issue is part of EP-0006 and will be followed by:
- ISS-0014: Update TaskSerializer to include calculated properties
- ISS-0015: Update frontend shouldShowTask filtering logic
- ISS-0016: Add comprehensive test coverage for hierarchy deletion