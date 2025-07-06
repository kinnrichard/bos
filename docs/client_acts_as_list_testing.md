# Client Acts as List Testing Guide

This guide explains how to debug and extend position calculation logic when drag-and-drop behavior doesn't match the server.

## Problem: Client Predictions Don't Match Server

When you experience:
- Off-by-1 or off-by-2 position errors
- Client optimistic updates that get corrected by server refresh
- Tasks ending up in different positions than expected

The issue is likely that the TypeScript position calculation logic doesn't match Rails `acts_as_list` behavior.

## Solution: Test Against Real Rails Behavior

### Step 1: Reproduce the Bug in Rails Tests

Create a new test case in `/test/integration/acts_as_list_simple_test.rb`:

```ruby
test "reproduce user bug: your specific scenario" do
  puts "\n=== Your Bug Scenario ==="
  
  # Create tasks matching your bug scenario
  tasks = {}
  # Example: Create 5 tasks at positions 1-5
  (1..5).each do |i|
    tasks[i] = @job.tasks.create!(title: "Task #{i}", position: i)
  end
  
  puts "Initial positions:"
  tasks.each { |i, task| puts "  Task #{i}: position #{task.position}" }
  
  # Reproduce the exact drag operation that's failing
  puts "\nPerforming operation: [describe what you're testing]"
  
  # Example: Move Task 2 to position 4
  moving_task = tasks[2]
  target_position = 4
  
  moving_task.insert_at(target_position)
  
  # Show the actual Rails results
  tasks.each { |i, task| tasks[i] = task.reload }
  
  puts "\nActual Rails results:"
  final_positions = {}
  tasks.each do |i, task| 
    final_positions[i] = task.position
    puts "  Task #{i}: position #{task.position}"
  end
  
  # Export the results for TypeScript tests
  export_fixture("your_bug_scenario", {
    description: "Your specific bug description",
    initial_positions: (1..5).to_a.map { |i| [i, i] }.to_h,
    operation: { task: 2, from_position: 2, to_position: target_position },
    final_positions: final_positions
  })
end
```

### Step 2: Run the Rails Test

```bash
cd /path/to/bos
rails test test/integration/acts_as_list_simple_test.rb::ActsAsListSimpleTest::test_reproduce_user_bug_your_specific_scenario -v
```

This will:
1. Show you the **actual Rails behavior** in the console
2. Generate a JSON fixture file at `/frontend/src/lib/utils/test-fixtures/your_bug_scenario.json`

### Step 3: Create TypeScript Validation Test

Create a test in `/frontend/src/lib/utils/rails-validation.test.ts`:

```typescript
import yourBugFixture from './test-fixtures/your_bug_scenario.json';

describe('Your Bug Scenario', () => {
  it('should match Rails behavior for your specific case', () => {
    const railsResult = yourBugFixture.test_result;
    
    // Create tasks matching Rails test
    const tasks: Task[] = Object.entries(railsResult.initial_positions).map(([id, position]) => ({
      id: `task${id}`,
      position: position as number,
      parent_id: 'test_parent'
    }));
    
    // Apply the same operation using TypeScript logic
    const positionUpdates = [{
      id: `task${railsResult.operation.task}`,
      position: railsResult.operation.to_position,
      parent_id: 'test_parent'
    }];
    
    const result = ClientActsAsList.applyPositionUpdates(tasks, positionUpdates);
    
    // Check that TypeScript matches Rails results
    const finalPositions = new Map(result.updatedTasks.map(t => [t.id, t.position]));
    
    Object.entries(railsResult.final_positions).forEach(([taskId, expectedPosition]) => {
      const actualPosition = finalPositions.get(`task${taskId}`);
      expect(actualPosition).toBe(expectedPosition, 
        `Task ${taskId} should be at position ${expectedPosition}, got ${actualPosition}`);
    });
    
    console.log('✓ Your bug scenario matches Rails behavior');
  });
});
```

### Step 4: Run TypeScript Validation

```bash
cd frontend
npx vitest run src/lib/utils/rails-validation.test.ts -t "Your Bug Scenario"
```

If the test **passes**: Your TypeScript logic correctly matches Rails behavior. The bug might be elsewhere.

If the test **fails**: Your TypeScript logic doesn't match Rails. You need to fix it.

## How to Help an AI Agent Extend Tests

### For the Human User

1. **Describe the exact scenario**:
   ```
   "I'm dragging Task A from position X to position Y, and the client shows 
   position Z but after refresh it's at position W"
   ```

2. **Provide console logs** if available:
   ```
   Client predicted: Task A at position Z
   Server result: Task A at position W
   ```

3. **Give the AI this prompt**:
   ```
   I found a drag-and-drop position bug. Please follow the process in 
   /docs/client_acts_as_list_testing.md to:
   
   1. Add a Rails test for my scenario: [describe scenario]
   2. Run it to capture actual Rails behavior
   3. Create a TypeScript validation test
   4. Fix any logic that doesn't match Rails
   
   My specific scenario is: [detailed description]
   ```

### For the AI Agent

When asked to debug position calculation issues:

1. **Read this guide** to understand the testing process
2. **Create a Rails test** in `/test/integration/acts_as_list_simple_test.rb` based on the user's scenario
3. **Run the Rails test** to capture actual `acts_as_list` behavior
4. **Examine the fixture** generated in `/frontend/src/lib/utils/test-fixtures/`
5. **Create a TypeScript validation test** using the fixture
6. **Run the validation test** to see if TypeScript logic matches Rails
7. **Fix any mismatches** in:
   - `/frontend/src/lib/utils/position-calculator.ts`
   - `/frontend/src/lib/utils/client-acts-as-list.ts`

## Key Files to Understand

### Rails Side
- `/app/models/task.rb` - Contains `acts_as_list scope: [:job_id, :parent_id]`
- `/app/controllers/api/v1/tasks_controller.rb` - Uses `task.insert_at(position)`
- `/test/integration/acts_as_list_simple_test.rb` - Test harness for capturing Rails behavior

### TypeScript Side
- `/frontend/src/lib/utils/position-calculator.ts` - Calculates target positions for drag operations
- `/frontend/src/lib/utils/client-acts-as-list.ts` - Simulates Rails gap elimination and insertion
- `/frontend/src/lib/utils/rails-validation.test.ts` - Tests TypeScript logic against Rails fixtures

## Common Rails acts_as_list Behaviors

Based on testing with `scope: [:job_id, :parent_id]`:

1. **`task.insert_at(position)` is literal** - puts task exactly at that position
2. **Gap elimination is automatic** - when a task moves, gaps are filled by shifting other tasks
3. **Position shifting happens automatically** - tasks at/after insertion point shift up by 1
4. **Operations are sequential** - in multi-task scenarios, each operation affects subsequent ones

## Debugging Tips

1. **Always test single-task scenarios first** - easier to understand the basic behavior
2. **Then test multi-task scenarios** - these reveal sequential operation effects  
3. **Check both within-scope and cross-scope moves** - different parent_id values
4. **Verify the scope configuration** - Rails acts_as_list scope should match TypeScript assumptions
5. **Look at the actual SQL** - add logging to see what Rails is doing

## Example: Perfect Test Case

```ruby
test "debug off by 1 error when moving task down" do
  puts "\n=== Off-by-1 Debug ==="
  
  # Setup: 5 tasks in sequence
  tasks = (1..5).map { |i| @job.tasks.create!(title: "Task #{i}", position: i) }
  
  puts "Before: #{tasks.map(&:position).join(', ')}"
  
  # Bug: Moving task 2 to position 4, client predicts 4 but server shows 3
  tasks[1].insert_at(4)  # Task 2 (index 1) to position 4
  
  tasks.each(&:reload)
  puts "After:  #{tasks.map(&:position).join(', ')}"
  puts "Task 2 ended up at position: #{tasks[1].position}"
  
  # Export for TypeScript validation
  export_fixture("off_by_1_debug", {
    initial: [1,2,3,4,5],
    operation: "move task 2 to position 4", 
    final: tasks.map(&:position),
    task_2_final: tasks[1].position
  })
end
```

This approach ensures that TypeScript client predictions exactly match Rails server behavior.