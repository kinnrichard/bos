---
issue_id: ISS-0014
title: Update TaskSerializer to include discarded_at and calculated properties
description: Modify TaskSerializer to include discarded_at field and has_discarded_ancestor calculated property in API responses
status: open
priority: high
assignee: unassigned
created_date: 2025-07-21T18:30:00.000Z
updated_date: 2025-07-21T18:30:00.000Z
estimated_hours: 3
actual_hours: 0
tags:
  - backend
  - serializer
  - api
  - calculated-property
epic_id: EP-0006
sprint: null
completion_percentage: 0
---

# Update TaskSerializer to Include Calculated Properties

## Overview
Modify the TaskSerializer to include the `discarded_at` field and the new `has_discarded_ancestor` calculated property in API responses. This enables the frontend to properly filter tasks based on hierarchy deletion logic.

## Requirements

### Serializer Updates
Update `app/serializers/task_serializer.rb` to include:

1. **discarded_at field**: Currently missing from serialized attributes
2. **has_discarded_ancestor property**: New calculated property from Task model

### Implementation
```ruby
# In app/serializers/task_serializer.rb
class TaskSerializer < ApplicationSerializer
  # Existing attributes...
  
  # Add missing discarded_at field
  attribute :discarded_at
  
  # Add calculated property
  attribute :has_discarded_ancestor
  
  def has_discarded_ancestor
    object.has_discarded_ancestor
  end
end
```

### API Response Format
Ensure the API responses include both fields in the expected format:

```json
{
  "data": {
    "id": "123",
    "type": "task",
    "attributes": {
      "name": "Sample Task",
      "status": "pending",
      "discarded_at": null,
      "has_discarded_ancestor": false,
      // ... other attributes
    }
  }
}
```

## Acceptance Criteria

### Functional Requirements
- [ ] `discarded_at` field is included in all task API responses
- [ ] `has_discarded_ancestor` calculated property is included in all task API responses  
- [ ] Values are correctly serialized (null for discarded_at when not deleted, boolean for calculated property)
- [ ] Performance impact is minimal when serializing task collections
- [ ] Existing API functionality remains unchanged

### API Consistency Requirements
- [ ] Field naming follows existing API conventions
- [ ] Date formatting matches other timestamp fields in the API
- [ ] Boolean values are properly serialized (true/false, not 1/0)
- [ ] Fields appear in logical order within the attributes object

### Performance Requirements
- [ ] No N+1 queries introduced when serializing task collections
- [ ] Serialization performance impact <5% compared to current implementation
- [ ] Memory usage remains reasonable with large task datasets

## Implementation Details

### Current TaskSerializer Analysis
First, examine the current TaskSerializer to understand existing structure:

```bash
# Check current serializer implementation
cat app/serializers/task_serializer.rb
```

### Required Changes
Based on typical Rails serializer patterns, the updates should be:

```ruby
class TaskSerializer < ApplicationSerializer
  # Existing attributes (keep all current ones)
  attributes :id, :name, :status, :position, :parent_id, :created_at, :updated_at
  # ... other existing attributes
  
  # Add new attributes
  attribute :discarded_at
  attribute :has_discarded_ancestor
  
  # Calculated property method
  def has_discarded_ancestor
    object.has_discarded_ancestor
  end
  
  # Ensure proper date formatting for discarded_at
  def discarded_at
    object.discarded_at&.iso8601
  end
end
```

### Performance Optimization
To avoid N+1 queries when serializing collections:

```ruby
# In controller or wherever tasks are fetched for serialization
tasks = Task.includes(:parent).where(...)

# This ensures parent relationships are preloaded for has_discarded_ancestor calls
```

## Testing Requirements

### Unit Tests (`test/serializers/task_serializer_test.rb`)

#### Basic Serialization Tests
```ruby
class TaskSerializerTest < ActiveSupport::TestCase
  test "includes discarded_at field in serialization" do
    task = create(:task, discarded_at: Time.current)
    serialized = TaskSerializer.new(task).serializable_hash
    
    assert_includes serialized[:data][:attributes], :discarded_at
    assert_not_nil serialized[:data][:attributes][:discarded_at]
  end
  
  test "includes has_discarded_ancestor field in serialization" do
    task = create(:task)
    serialized = TaskSerializer.new(task).serializable_hash
    
    assert_includes serialized[:data][:attributes], :has_discarded_ancestor
    assert_boolean serialized[:data][:attributes][:has_discarded_ancestor]
  end
  
  test "discarded_at is null for non-deleted tasks" do
    task = create(:task, discarded_at: nil)
    serialized = TaskSerializer.new(task).serializable_hash
    
    assert_nil serialized[:data][:attributes][:discarded_at]
  end
  
  test "has_discarded_ancestor returns correct boolean values" do
    parent = create(:task, discarded_at: Time.current)
    child = create(:task, parent: parent)
    
    child_serialized = TaskSerializer.new(child).serializable_hash
    parent_serialized = TaskSerializer.new(parent).serializable_hash
    
    assert_equal true, child_serialized[:data][:attributes][:has_discarded_ancestor]
    assert_equal false, parent_serialized[:data][:attributes][:has_discarded_ancestor]
  end
end
```

#### Edge Case Tests
```ruby
test "handles orphaned tasks in serialization" do
  task = create(:task)
  task.update_column(:parent_id, 999999)  # Non-existent parent
  
  serialized = TaskSerializer.new(task).serializable_hash
  assert_equal false, serialized[:data][:attributes][:has_discarded_ancestor]
end

test "serializes collection without N+1 queries" do
  parent = create(:task)
  children = create_list(:task, 5, parent: parent)
  
  assert_queries(2) do  # Should be minimal queries
    TaskSerializer.new(children).serializable_hash
  end
end
```

### Integration Tests (`test/controllers/api/v1/tasks_controller_test.rb`)

```ruby
test "GET /api/v1/tasks includes new calculated properties" do
  task = create(:task)
  get api_v1_tasks_path, headers: auth_headers
  
  assert_response :success
  json = JSON.parse(response.body)
  task_data = json['data'].first['attributes']
  
  assert_includes task_data, 'discarded_at'
  assert_includes task_data, 'has_discarded_ancestor'
end

test "API response format matches expected structure" do
  parent = create(:task, discarded_at: Time.current)
  child = create(:task, parent: parent)
  
  get api_v1_task_path(child), headers: auth_headers
  
  assert_response :success
  json = JSON.parse(response.body)
  attributes = json['data']['attributes']
  
  assert_not_nil attributes['discarded_at']
  assert_equal true, attributes['has_discarded_ancestor']
end
```

### Performance Tests
```ruby
test "collection serialization performs within acceptable limits" do
  create_list(:task, 50)
  
  time = Benchmark.measure do
    tasks = Task.all
    TaskSerializer.new(tasks).serializable_hash
  end
  
  assert_operator time.real, :<, 0.1  # Should complete within 100ms
end
```

## API Documentation Updates

### Update API Specification
Ensure the API documentation reflects the new fields:

```yaml
# In API spec file
Task:
  type: object
  properties:
    id:
      type: string
      format: uuid
    name:
      type: string
    status:
      type: string
      enum: [pending, in_progress, completed]
    discarded_at:
      type: string
      format: date-time
      nullable: true
      description: Timestamp when the task was deleted/discarded
    has_discarded_ancestor:
      type: boolean
      description: True if any ancestor task in the hierarchy is discarded
    # ... other properties
```

## Backward Compatibility

### Version Considerations
- Ensure new fields don't break existing API consumers
- Consider API versioning if breaking changes are introduced
- Test with existing frontend code to ensure compatibility

### Default Values
- `discarded_at` should be `null` for existing tasks
- `has_discarded_ancestor` should be `false` for root tasks or tasks with no discarded ancestors

## Performance Impact Analysis

### Benchmark Current vs New Implementation
```ruby
# Benchmark script to measure performance impact
require 'benchmark'

# Current implementation
current_time = Benchmark.measure do
  tasks = Task.limit(100)
  # Serialize with current implementation
end

# New implementation  
new_time = Benchmark.measure do
  tasks = Task.includes(:parent).limit(100)
  TaskSerializer.new(tasks).serializable_hash
end

puts "Performance impact: #{((new_time.real - current_time.real) / current_time.real * 100).round(2)}%"
```

## Definition of Done

- [ ] TaskSerializer updated with both new attributes
- [ ] All unit tests written and passing
- [ ] Integration tests confirm API responses include new fields
- [ ] Performance impact is within acceptable limits (<5%)
- [ ] API documentation updated to reflect changes
- [ ] Backward compatibility maintained
- [ ] Code reviewed and approved
- [ ] No regressions in existing API functionality

## Dependencies

- **Depends on**: ISS-0013 (has_discarded_ancestor method must be implemented first)
- **Blocks**: ISS-0015 (frontend updates depend on API providing these fields)

## Related Issues
This issue is part of EP-0006 and supports:
- ISS-0015: Update frontend shouldShowTask filtering logic
- ISS-0016: Add comprehensive test coverage for hierarchy deletion