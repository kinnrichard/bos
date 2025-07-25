---
actual_hours: 0
assignees: []
created_at: '2025-07-25T15:03:00.000000'
dependencies:
- ISS-0013
- ISS-0014
- ISS-0015
description: Implement thorough test coverage for the complete task hierarchy deletion workflow from backend to frontend
due_date: null
estimated_hours: 8
id: ISS-0016
labels:
- testing
- integration
- e2e
- hierarchy
- workflow
metadata:
  goal: Add comprehensive test coverage for task hierarchy deletion behavior
  owner: null
  progress: 0
  subtasks: []
  type: issue
parent: EP-0006
priority: medium
status: blocked
tags:
- issue
- testing
title: Add comprehensive test coverage for task hierarchy deletion behavior
updated_at: '2025-07-25T15:03:00.000000'
---

# Add Comprehensive Test Coverage for Task Hierarchy Deletion

## Overview
Implement comprehensive test coverage for the complete task hierarchy deletion workflow, covering backend model logic, API serialization, frontend filtering, and end-to-end user workflows. This ensures the feature works correctly across all layers and handles edge cases properly.

## Testing Strategy

### Test Pyramid Structure
1. **Unit Tests (70%)**: Fast, focused tests for individual components
2. **Integration Tests (20%)**: API and component integration testing  
3. **End-to-End Tests (10%)**: Complete user workflow testing

### Test Categories
- **Backend Model Tests**: Task model `has_discarded_ancestor` method
- **Serializer Tests**: API response format and data accuracy
- **Frontend Unit Tests**: Store and component filtering logic
- **Integration Tests**: API-to-frontend data flow
- **E2E Tests**: Complete user workflows
- **Performance Tests**: Ensure no regressions
- **Edge Case Tests**: Handle unusual scenarios

## Backend Testing

### Model Tests (`test/models/task_test.rb`)

#### Comprehensive Hierarchy Scenarios
```ruby
class TaskHierarchyDeletionTest < ActiveSupport::TestCase
  test "simple parent-child deletion hierarchy" do
    parent = create(:task, name: "Parent")
    child = create(:task, name: "Child", parent: parent)
    
    assert_not child.has_discarded_ancestor
    
    parent.update!(discarded_at: Time.current)
    assert child.has_discarded_ancestor
  end
  
  test "multi-level hierarchy with middle deletion" do
    grandparent = create(:task, name: "Grandparent")
    parent = create(:task, name: "Parent", parent: grandparent)
    child = create(:task, name: "Child", parent: parent)
    grandchild = create(:task, name: "Grandchild", parent: child)
    
    # Delete middle level
    parent.update!(discarded_at: Time.current)
    
    assert_not grandparent.has_discarded_ancestor
    assert_not parent.has_discarded_ancestor  # The deleted task itself
    assert child.has_discarded_ancestor
    assert grandchild.has_discarded_ancestor
  end
  
  test "sibling tasks with one parent deleted" do
    parent = create(:task, name: "Parent")
    child1 = create(:task, name: "Child 1", parent: parent)
    child2 = create(:task, name: "Child 2", parent: parent)
    
    parent.update!(discarded_at: Time.current)
    
    assert child1.has_discarded_ancestor
    assert child2.has_discarded_ancestor
  end
  
  test "mixed deletion states in hierarchy" do
    grandparent = create(:task, name: "Grandparent", discarded_at: Time.current)
    parent = create(:task, name: "Parent", parent: grandparent)
    child = create(:task, name: "Child", parent: parent, discarded_at: Time.current)
    grandchild = create(:task, name: "Grandchild", parent: child)
    
    assert_not grandparent.has_discarded_ancestor  # Top level deleted task
    assert parent.has_discarded_ancestor           # Has deleted grandparent
    assert_not child.has_discarded_ancestor        # The deleted task itself
    assert grandchild.has_discarded_ancestor       # Has deleted ancestors
  end
end

class TaskHierarchyEdgeCasesTest < ActiveSupport::TestCase
  test "handles very deep hierarchy efficiently" do
    tasks = []
    20.times do |i|
      tasks << create(:task, name: "Task #{i}", parent: tasks.last)
    end
    
    # Delete root task
    tasks.first.update!(discarded_at: Time.current)
    
    # All descendants should have deleted ancestor
    tasks[1..-1].each do |task|
      assert task.has_discarded_ancestor, "Task #{task.name} should have discarded ancestor"
    end
    
    # Should complete quickly
    assert_performance_faster_than(0.05) do
      tasks.last.has_discarded_ancestor
    end
  end
  
  test "handles orphaned tasks gracefully" do
    task = create(:task, name: "Orphaned")
    task.update_column(:parent_id, 999999)  # Non-existent parent
    
    assert_not task.has_discarded_ancestor
  end
  
  test "prevents infinite loops with circular references" do
    parent = create(:task, name: "Parent")
    child = create(:task, name: "Child", parent: parent)
    
    # Create circular reference
    parent.update_column(:parent_id, child.id)
    
    assert_not child.has_discarded_ancestor
    assert_not parent.has_discarded_ancestor
  end
end
```

### Serializer Integration Tests (`test/serializers/task_serializer_test.rb`)

```ruby
class TaskSerializerHierarchyTest < ActiveSupport::TestCase
  test "serializes hierarchy deletion properties correctly" do
    parent = create(:task, name: "Parent", discarded_at: Time.current)
    child = create(:task, name: "Child", parent: parent)
    
    parent_data = TaskSerializer.new(parent).serializable_hash[:data][:attributes]
    child_data = TaskSerializer.new(child).serializable_hash[:data][:attributes]
    
    # Parent (deleted task)
    assert_not_nil parent_data[:discarded_at]
    assert_equal false, parent_data[:has_discarded_ancestor]
    
    # Child (has deleted parent)
    assert_nil child_data[:discarded_at]
    assert_equal true, child_data[:has_discarded_ancestor]
  end
  
  test "collection serialization includes hierarchy properties" do
    parent = create(:task, discarded_at: Time.current)
    children = create_list(:task, 3, parent: parent)
    
    all_tasks = [parent] + children
    serialized = TaskSerializer.new(all_tasks).serializable_hash
    
    # Verify all tasks have the required properties
    serialized[:data].each do |task_data|
      attributes = task_data[:attributes]
      assert_includes attributes, :discarded_at
      assert_includes attributes, :has_discarded_ancestor
      assert_boolean attributes[:has_discarded_ancestor]
    end
  end
end
```

## Frontend Testing

### Store Tests (`tests/unit/task-store.test.ts`)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { TaskStore } from '$lib/stores/task-store.svelte.ts';

describe('TaskStore Hierarchy Deletion', () => {
  let taskStore: TaskStore;
  
  beforeEach(() => {
    taskStore = new TaskStore();
  });
  
  it('filters out descendants of deleted tasks in normal view', () => {
    const tasks = [
      { id: '1', name: 'Parent', discarded_at: '2023-01-01T00:00:00Z', has_discarded_ancestor: false },
      { id: '2', name: 'Child', discarded_at: null, has_discarded_ancestor: true, parent_id: '1' },
      { id: '3', name: 'Grandchild', discarded_at: null, has_discarded_ancestor: true, parent_id: '2' },
      { id: '4', name: 'Unrelated', discarded_at: null, has_discarded_ancestor: false }
    ];
    
    taskStore.setTasks(tasks);
    taskStore.setShowDeleted(false);
    
    const visibleTasks = taskStore.visibleTasks;
    
    expect(visibleTasks).toHaveLength(1);
    expect(visibleTasks[0].name).toBe('Unrelated');
  });
  
  it('shows deleted tasks but not their descendants in deleted view', () => {
    const tasks = [
      { id: '1', name: 'Deleted Parent', discarded_at: '2023-01-01T00:00:00Z', has_discarded_ancestor: false },
      { id: '2', name: 'Child of Deleted', discarded_at: null, has_discarded_ancestor: true, parent_id: '1' },
      { id: '3', name: 'Independently Deleted', discarded_at: '2023-01-01T00:00:00Z', has_discarded_ancestor: false }
    ];
    
    taskStore.setTasks(tasks);
    taskStore.setShowDeleted(true);
    
    const visibleTasks = taskStore.visibleTasks;
    
    expect(visibleTasks).toHaveLength(2);
    expect(visibleTasks.map(t => t.name)).toEqual(['Deleted Parent', 'Independently Deleted']);
  });
  
  it('updates visibility when task deletion state changes', () => {
    const tasks = [
      { id: '1', name: 'Parent', discarded_at: null, has_discarded_ancestor: false },
      { id: '2', name: 'Child', discarded_at: null, has_discarded_ancestor: false, parent_id: '1' }
    ];
    
    taskStore.setTasks(tasks);
    taskStore.setShowDeleted(false);
    
    expect(taskStore.visibleTasks).toHaveLength(2);
    
    // Simulate parent deletion
    const updatedTasks = [
      { id: '1', name: 'Parent', discarded_at: '2023-01-01T00:00:00Z', has_discarded_ancestor: false },
      { id: '2', name: 'Child', discarded_at: null, has_discarded_ancestor: true, parent_id: '1' }
    ];
    
    taskStore.setTasks(updatedTasks);
    
    expect(taskStore.visibleTasks).toHaveLength(0);
  });
});
```

### Component Tests (`tests/unit/components/task-list.test.ts`)

```typescript
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import TaskList from '$lib/components/tasks/TaskList.svelte';

describe('TaskList Hierarchy Deletion', () => {
  it('renders only visible tasks based on hierarchy deletion', () => {
    const tasks = [
      { id: '1', name: 'Visible Task', discarded_at: null, has_discarded_ancestor: false },
      { id: '2', name: 'Hidden Child', discarded_at: null, has_discarded_ancestor: true },
      { id: '3', name: 'Another Visible', discarded_at: null, has_discarded_ancestor: false }
    ];
    
    render(TaskList, { tasks, showDeleted: false });
    
    expect(screen.getByText('Visible Task')).toBeInTheDocument();
    expect(screen.queryByText('Hidden Child')).not.toBeInTheDocument();
    expect(screen.getByText('Another Visible')).toBeInTheDocument();
  });
  
  it('shows appropriate tasks in deleted view', () => {
    const tasks = [
      { id: '1', name: 'Deleted Parent', discarded_at: '2023-01-01T00:00:00Z', has_discarded_ancestor: false },
      { id: '2', name: 'Child of Deleted', discarded_at: null, has_discarded_ancestor: true },
      { id: '3', name: 'Independently Deleted', discarded_at: '2023-01-01T00:00:00Z', has_discarded_ancestor: false }
    ];
    
    render(TaskList, { tasks, showDeleted: true });
    
    expect(screen.getByText('Deleted Parent')).toBeInTheDocument();
    expect(screen.queryByText('Child of Deleted')).not.toBeInTheDocument();
    expect(screen.getByText('Independently Deleted')).toBeInTheDocument();
  });
});
```

## API Integration Tests

### Controller Tests (`test/controllers/api/v1/tasks_controller_test.rb`)

```ruby
class Api::V1::TasksControllerHierarchyTest < ActionDispatch::IntegrationTest
  test "GET /api/v1/tasks includes hierarchy deletion properties" do
    parent = create(:task, discarded_at: Time.current)
    child = create(:task, parent: parent)
    
    get api_v1_tasks_path, headers: auth_headers
    
    assert_response :success
    json = JSON.parse(response.body)
    
    # Find child task in response
    child_data = json['data'].find { |t| t['id'] == child.id.to_s }
    attributes = child_data['attributes']
    
    assert_includes attributes, 'has_discarded_ancestor'
    assert_equal true, attributes['has_discarded_ancestor']
  end
  
  test "task deletion updates affect descendant properties" do
    parent = create(:task)
    child = create(:task, parent: parent)
    
    # First request - parent not deleted
    get api_v1_task_path(child), headers: auth_headers
    json1 = JSON.parse(response.body)
    assert_equal false, json1['data']['attributes']['has_discarded_ancestor']
    
    # Delete parent
    parent.update!(discarded_at: Time.current)
    
    # Second request - parent now deleted
    get api_v1_task_path(child), headers: auth_headers
    json2 = JSON.parse(response.body)
    assert_equal true, json2['data']['attributes']['has_discarded_ancestor']
  end
end
```

## End-to-End Tests

### Complete User Workflows (`tests/e2e/task-hierarchy-deletion.spec.ts`)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Task Hierarchy Deletion Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tasks');
    await authenticateUser(page);
  });
  
  test('complete hierarchy deletion and restoration workflow', async ({ page }) => {
    // Create task hierarchy
    await createTask(page, 'Parent Task', { id: 'parent' });
    await createTask(page, 'Child Task 1', { parent: 'parent', id: 'child1' });
    await createTask(page, 'Child Task 2', { parent: 'parent', id: 'child2' });
    await createTask(page, 'Grandchild Task', { parent: 'child1', id: 'grandchild' });
    
    // Verify all tasks are visible
    await expect(page.getByText('Parent Task')).toBeVisible();
    await expect(page.getByText('Child Task 1')).toBeVisible();
    await expect(page.getByText('Child Task 2')).toBeVisible();
    await expect(page.getByText('Grandchild Task')).toBeVisible();
    
    // Delete parent task
    await deleteTask(page, 'parent');
    
    // Verify descendants are hidden in normal view
    await expect(page.getByText('Child Task 1')).not.toBeVisible();
    await expect(page.getByText('Child Task 2')).not.toBeVisible();
    await expect(page.getByText('Grandchild Task')).not.toBeVisible();
    
    // Switch to deleted view
    await page.click('[data-testid="show-deleted-toggle"]');
    
    // Verify only deleted parent is shown (not descendants)
    await expect(page.getByText('Parent Task')).toBeVisible();
    await expect(page.getByText('Child Task 1')).not.toBeVisible();
    await expect(page.getByText('Child Task 2')).not.toBeVisible();
    
    // Restore parent task
    await restoreTask(page, 'parent');
    
    // Return to normal view
    await page.click('[data-testid="show-deleted-toggle"]');
    
    // Verify all tasks are visible again
    await expect(page.getByText('Parent Task')).toBeVisible();
    await expect(page.getByText('Child Task 1')).toBeVisible();
    await expect(page.getByText('Child Task 2')).toBeVisible();
    await expect(page.getByText('Grandchild Task')).toBeVisible();
  });
  
  test('individual child deletion while parent is deleted', async ({ page }) => {
    await setupDeletedParentHierarchy(page);
    
    // Switch to deleted view
    await page.click('[data-testid="show-deleted-toggle"]');
    
    // Delete a child task individually
    await deleteTask(page, 'child1');
    
    // Verify the individually deleted child now appears in deleted view
    await expect(page.getByText('Deleted Parent')).toBeVisible();
    await expect(page.getByText('Child Task 1')).toBeVisible();
    
    // Restore parent
    await restoreTask(page, 'parent');
    
    // Return to normal view
    await page.click('[data-testid="show-deleted-toggle"]');
    
    // Verify parent and non-deleted child are visible
    await expect(page.getByText('Parent Task')).toBeVisible();
    await expect(page.getByText('Child Task 2')).toBeVisible();
    
    // But individually deleted child should not be visible
    await expect(page.getByText('Child Task 1')).not.toBeVisible();
  });
  
  test('performance with large hierarchy', async ({ page }) => {
    // Create large hierarchy
    await createLargeTaskHierarchy(page, 100);
    
    const startTime = Date.now();
    
    // Delete root task
    await deleteTask(page, 'root');
    
    const endTime = Date.now();
    const deletionTime = endTime - startTime;
    
    // Should complete within reasonable time
    expect(deletionTime).toBeLessThan(5000); // 5 seconds max
    
    // Verify descendants are hidden
    await expect(page.getByText('Child 0')).not.toBeVisible();
    await expect(page.getByText('Child 50')).not.toBeVisible();
  });
});
```

## Performance Testing

### Load Tests
```ruby
class TaskHierarchyPerformanceTest < ActionDispatch::IntegrationTest
  test "hierarchy deletion queries perform efficiently" do
    # Create large hierarchy
    root = create(:task)
    tasks = [root]
    
    100.times do |i|
      parent = tasks[rand(tasks.length)]
      tasks << create(:task, parent: parent)
    end
    
    # Measure query performance
    assert_queries_count(2) do  # Should be minimal queries
      get api_v1_tasks_path, headers: auth_headers
    end
    
    assert_performance_faster_than(0.5) do
      get api_v1_tasks_path, headers: auth_headers
    end
  end
end
```

### Frontend Performance Tests
```typescript
test('filtering large task lists performs efficiently', async () => {
  const largeTasks = generateTaskHierarchy(1000);
  const startTime = performance.now();
  
  render(TaskList, { tasks: largeTasks });
  
  const endTime = performance.now();
  expect(endTime - startTime).toBeLessThan(100); // 100ms max
});
```

## Test Data Setup

### Factory Enhancements
```ruby
# In factories/tasks.rb
FactoryBot.define do
  factory :task do
    # ... existing attributes
    
    trait :with_deleted_parent do
      after(:create) do |task|
        parent = create(:task, discarded_at: Time.current)
        task.update!(parent: parent)
      end
    end
    
    trait :deleted_with_children do
      discarded_at { Time.current }
      
      after(:create) do |task|
        create_list(:task, 2, parent: task)
      end
    end
  end
end
```

### Helper Methods
```ruby
# test/test_helper.rb
module TaskHierarchyTestHelpers
  def create_task_hierarchy(depth = 3)
    tasks = []
    depth.times do |i|
      tasks << create(:task, 
        name: "Task Level #{i}",
        parent: tasks[i-1]
      )
    end
    tasks
  end
  
  def assert_boolean(value)
    assert [true, false].include?(value), "Expected boolean, got #{value.class}: #{value}"
  end
end
```

## Coverage Goals

### Code Coverage Targets
- Backend model methods: 100%
- Serializer logic: 100%
- Frontend filtering logic: 95%
- Component integration: 90%
- E2E workflows: 80%

### Test Categories Coverage
- Happy path scenarios: 100%
- Edge cases: 90%
- Error conditions: 85%
- Performance scenarios: 80%

## Definition of Done

- [ ] All backend model tests written and passing (100% coverage)
- [ ] Serializer integration tests cover all scenarios
- [ ] Frontend unit tests for store and component logic
- [ ] API integration tests verify request/response flow
- [ ] E2E tests cover complete user workflows
- [ ] Performance tests confirm no regressions
- [ ] Edge case tests handle unusual scenarios
- [ ] Test helpers and factories support easy test creation
- [ ] CI/CD pipeline includes all test categories
- [ ] Test documentation explains scenarios and setup
- [ ] Code coverage meets or exceeds targets

## Dependencies

- **Depends on**: All other issues in EP-0006 (ISS-0013, ISS-0014, ISS-0015)
- **Blocks**: Epic completion and production deployment

## Related Issues
This issue completes EP-0006 testing requirements and validates:
- ISS-0013: Backend model implementation
- ISS-0014: API serialization functionality  
- ISS-0015: Frontend filtering behavior

## ⚠️ WORK BLOCKED - DO NOT BEGIN IMPLEMENTATION

**This issue is BLOCKED pending database structure refinements. Do not begin work until EP-0006 is unblocked.**

---

## Notes
- Test coverage should be comprehensive but not redundant
- Focus on testing business logic rather than framework behavior
- Ensure tests are maintainable and serve as documentation