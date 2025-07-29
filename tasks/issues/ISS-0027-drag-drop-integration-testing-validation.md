# ISS-0027: Drag-Drop Integration Testing & Validation

## Overview
**Epic**: Fix Drag-and-Drop Architecture  
**Story Type**: Quality Assurance & Validation (Non-Breaking)  
**Priority**: HIGH  
**Risk Level**: MINIMAL - Only additive testing and validation  
**Depends on**: ISS-0023, ISS-0024, ISS-0025, ISS-0026 (All previous stories)

## Problem Statement
After implementing the foundational changes and improvements to the drag-drop system, we need comprehensive testing and validation to ensure:

1. The original bug is definitively fixed
2. All existing functionality is preserved  
3. New architecture is robust and maintainable
4. Performance impact is acceptable
5. Future regressions can be detected

## Acceptance Criteria

### ✅ Bug Resolution Validation
- [ ] Original bug "item 4 dragged between items 2&3 doesn't adopt item 1 as parent" is fixed
- [ ] No more `targetIndex: -1` errors in debug logs
- [ ] Parent assignment works correctly in all drag scenarios
- [ ] Comprehensive reproduction tests prevent regression

### ✅ Comprehensive Test Coverage
- [ ] Unit tests cover all new functions and logic paths
- [ ] Integration tests validate end-to-end drag-drop flows
- [ ] Edge case tests cover error conditions and boundary cases
- [ ] Performance tests ensure no significant regression

### ✅ Functionality Preservation
- [ ] All existing drag-drop features work as before
- [ ] Multi-select drag operations preserved
- [ ] Nesting and reordering modes work correctly
- [ ] Visual feedback and animations unchanged
- [ ] Keyboard shortcuts and accessibility preserved

### ✅ Architecture Validation
- [ ] Single canonical data source eliminates duplication
- [ ] Type system consistency maintained throughout
- [ ] Performance impact acceptable (no significant slowdown)
- [ ] Debug logging provides actionable information

## Implementation Details

### Original Bug Reproduction & Fix Validation

```typescript
// Comprehensive test for the original reported bug
describe('Original Bug Fix: Item 4 between Items 2&3', () => {
  test('item 4 dragged between items 2 and 3 adopts item 1 as parent', async () => {
    // Setup: Hierarchical structure
    // 1 (root)
    //   ├─ 2 (child of 1)
    //   └─ 3 (child of 1)  
    // 4 (root)
    const initialTasks = [
      { id: '1', position: 1000, parent_id: null, title: 'Parent Task' },
      { id: '2', position: 2000, parent_id: '1', title: 'First Child' },
      { id: '3', position: 3000, parent_id: '1', title: 'Second Child' },
      { id: '4', position: 4000, parent_id: null, title: 'Root Task to Move' }
    ];

    const { container } = render(<TaskList tasks={initialTasks} />);
    
    // Find task elements
    const task4Element = screen.getByTestId('task-4');
    const task3Element = screen.getByTestId('task-3');
    
    // Simulate dragging task 4 to position above task 3
    await dragAndDrop(task4Element, task3Element, { position: 'above' });
    
    // Verify the expected result:
    // 1 (root)
    //   ├─ 2 (child of 1)
    //   ├─ 4 (child of 1) <- moved here
    //   └─ 3 (child of 1)
    
    const updatedTasks = await waitFor(() => getTasksFromUI(container));
    const task4 = updatedTasks.find(t => t.id === '4');
    
    expect(task4.parent_id).toBe('1'); // Should adopt parent 1
    expect(task4.position).toBeLessThan(updatedTasks.find(t => t.id === '3').position); // Should be before task 3
    
    // Verify no error logs
    expect(console.error).not.toHaveBeenCalledWith(
      expect.stringMatching(/Target task not found in siblings/)
    );
  });

  test('no targetIndex: -1 errors during sibling detection', async () => {
    const consoleSpy = jest.spyOn(console, 'error');
    
    // Perform various drag operations
    await performComprehensiveDragTests();
    
    // Verify no sibling detection errors
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringMatching(/targetIndex.*-1/)
    );
    
    consoleSpy.mockRestore();
  });
});
```

### Comprehensive Drag-Drop Scenario Tests

```typescript
describe('Comprehensive Drag-Drop Scenarios', () => {
  
  test('nest mode: dragging task onto another makes it a child', async () => {
    const tasks = createHierarchicalTasks();
    const { container } = render(<TaskList tasks={tasks} />);
    
    await nestTask('task-5', 'task-2');
    
    const updatedTasks = getTasksFromUI(container);
    expect(updatedTasks.find(t => t.id === '5').parent_id).toBe('2');
  });

  test('reorder mode: dragging between siblings maintains parent', async () => {
    const tasks = createSiblingTasks();
    const { container } = render(<TaskList tasks={tasks} />);
    
    await reorderTask('task-3', 'task-1', { position: 'above' });
    
    const updatedTasks = getTasksFromUI(container);
    const task3 = updatedTasks.find(t => t.id === '3');
    const task1 = updatedTasks.find(t => t.id === '1');
    
    expect(task3.parent_id).toBe(task1.parent_id); // Same parent
    expect(task3.position).toBeLessThan(task1.position); // Positioned above
  });

  test('multi-select drag: all selected tasks move together', async () => {
    const tasks = createMultiSelectScenario();
    const { container } = render(<TaskList tasks={tasks} />);
    
    // Select multiple tasks
    await selectTasks(['task-2', 'task-3', 'task-4']);
    
    // Drag the group
    await dragSelectedTasks('task-5', { position: 'below' });
    
    const updatedTasks = getTasksFromUI(container);
    const movedTasks = updatedTasks.filter(t => ['2', '3', '4'].includes(t.id));
    
    // All should have moved to same parent
    movedTasks.forEach(task => {
      expect(task.parent_id).toBe(updatedTasks.find(t => t.id === '5').parent_id);
    });
  });

  test('cross-hierarchy drag: moving from one parent to another', async () => {
    const tasks = createCrossHierarchyScenario();
    const { container } = render(<TaskList tasks={tasks} />);
    
    await dragTask('child-of-parent-a', 'child-of-parent-b', { position: 'below' });
    
    const updatedTasks = getTasksFromUI(container);
    const movedTask = updatedTasks.find(t => t.id === 'child-of-parent-a');
    
    expect(movedTask.parent_id).toBe('parent-b'); // Adopted new parent
  });
});
```

### Edge Case and Error Handling Tests

```typescript
describe('Edge Cases and Error Handling', () => {
  
  test('handles missing position fields gracefully', async () => {
    const tasksWithMissingPositions = [
      { id: '1', parent_id: null, title: 'Task 1' }, // No position field
      { id: '2', position: 1000, parent_id: null, title: 'Task 2' }
    ];
    
    expect(() => {
      render(<TaskList tasks={tasksWithMissingPositions} />);
    }).not.toThrow();
    
    // Should normalize to default position
    const normalizedTasks = getTasksFromUI();
    expect(normalizedTasks.find(t => t.id === '1').position).toBe(0);
  });

  test('prevents circular references during drag', async () => {
    const tasks = createCircularReferenceScenario();
    const { container } = render(<TaskList tasks={tasks} />);
    
    // Try to drag parent onto its own child (should be prevented)
    await dragTask('parent-task', 'child-task', { mode: 'nest' });
    
    // Should not have moved (prevented by circular reference check)
    const updatedTasks = getTasksFromUI(container);
    expect(updatedTasks.find(t => t.id === 'parent-task').parent_id).toBe(null);
  });

  test('handles invalid drag targets gracefully', async () => {
    const tasks = createStandardTasks();
    const { container } = render(<TaskList tasks={tasks} />);
    
    // Try to drag to non-existent target
    const consoleSpy = jest.spyOn(console, 'error');
    
    await dragTask('task-1', 'nonexistent-task');
    
    // Should handle gracefully without crashing
    expect(container).toBeInTheDocument();
    
    // Should log error but not crash
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching(/Target task not found/)
    );
    
    consoleSpy.mockRestore();
  });
});
```

### Performance and Architecture Validation

```typescript
describe('Performance and Architecture Validation', () => {
  
  test('canonical data source eliminates duplication', () => {
    const tasks = createLargeTaskSet(100);
    const { container } = render(<TaskList tasks={tasks} />);
    
    // Verify single data source is used
    const taskListInstance = getTaskListInstance(container);
    
    // Should have canonical source, not separate cleaned arrays
    expect(taskListInstance.canonicalTasks).toBeDefined();
    expect(taskListInstance.cleanedTasks).toBeUndefined();
    expect(taskListInstance.cleanedKeptTasks).toBeUndefined();
  });

  test('position calculations are synchronous', async () => {
    const tasks = createLargeTaskSet(50);
    const { container } = render(<TaskList tasks={tasks} />);
    
    const startTime = performance.now();
    
    // Perform drag operation
    await dragTask('task-25', 'task-40');
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Should complete reasonably quickly (adjust threshold as needed)
    expect(duration).toBeLessThan(1000); // 1 second max
  });

  test('memory usage remains stable with large task sets', () => {
    const initialMemory = performance.memory?.usedJSHeapSize || 0;
    
    // Create and destroy multiple large task lists
    for (let i = 0; i < 10; i++) {
      const tasks = createLargeTaskSet(200);
      const { unmount } = render(<TaskList tasks={tasks} />);
      unmount();
    }
    
    // Force garbage collection if available
    if (global.gc) global.gc();
    
    const finalMemory = performance.memory?.usedJSHeapSize || 0;
    const memoryIncrease = finalMemory - initialMemory;
    
    // Memory increase should be reasonable (adjust threshold as needed)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB max
  });
});
```

### Accessibility and User Experience Tests

```typescript
describe('Accessibility and User Experience', () => {
  
  test('keyboard navigation works after architecture changes', async () => {
    const tasks = createAccessibilityTestTasks();
    render(<TaskList tasks={tasks} />);
    
    // Test keyboard shortcuts
    await user.keyboard('{Shift>}{ArrowDown}{/Shift}'); // Multi-select
    await user.keyboard('{Control>}x{/Control}'); // Cut
    await user.keyboard('{ArrowDown}'); // Move selection
    await user.keyboard('{Control>}v{/Control}'); // Paste
    
    // Verify operations worked
    const updatedTasks = getTasksFromUI();
    // Add specific assertions based on expected behavior
  });

  test('screen reader announcements work correctly', async () => {
    const tasks = createAccessibilityTestTasks();
    render(<TaskList tasks={tasks} />);
    
    const announcements = getAriaLiveAnnouncements();
    
    await dragTask('task-1', 'task-2');
    
    // Should announce the move operation
    expect(announcements).toContain('Task moved to new position');
  });

  test('visual feedback preserved during drag operations', async () => {
    const tasks = createVisualFeedbackTasks();
    const { container } = render(<TaskList tasks={tasks} />);
    
    const taskElement = screen.getByTestId('task-1');
    
    // Start drag
    fireEvent.dragStart(taskElement);
    
    // Should show drag feedback
    expect(taskElement).toHaveClass('dragging');
    
    // End drag
    fireEvent.dragEnd(taskElement);
    
    // Should clear feedback
    expect(taskElement).not.toHaveClass('dragging');
  });
});
```

## Test Data Factories

```typescript
// Helper functions for creating test scenarios
function createHierarchicalTasks() {
  return [
    { id: '1', position: 1000, parent_id: null, title: 'Root 1' },
    { id: '2', position: 2000, parent_id: '1', title: 'Child 1.1' },
    { id: '3', position: 3000, parent_id: '1', title: 'Child 1.2' },
    { id: '4', position: 4000, parent_id: null, title: 'Root 2' },
    { id: '5', position: 5000, parent_id: '4', title: 'Child 2.1' }
  ];
}

function createSiblingTasks() {
  return [
    { id: 'parent', position: 1000, parent_id: null, title: 'Parent' },
    { id: '1', position: 2000, parent_id: 'parent', title: 'Sibling 1' },
    { id: '2', position: 3000, parent_id: 'parent', title: 'Sibling 2' },
    { id: '3', position: 4000, parent_id: 'parent', title: 'Sibling 3' }
  ];
}

function createLargeTaskSet(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `task-${i + 1}`,
    position: (i + 1) * 1000,
    parent_id: i % 3 === 0 ? null : `task-${Math.floor(i / 3) + 1}`,
    title: `Task ${i + 1}`
  }));
}
```

## File Changes Required

1. **New test files**:
   - `__tests__/drag-drop-integration.test.tsx` - Comprehensive integration tests
   - `__tests__/drag-drop-performance.test.tsx` - Performance validation
   - `__tests__/drag-drop-accessibility.test.tsx` - Accessibility tests
   - `__tests__/helpers/drag-drop-test-helpers.ts` - Test utilities

2. **Updated existing tests**:
   - Update any existing drag-drop tests to work with new architecture
   - Add regression prevention tests
   - Update test data to match new type requirements

3. **Test configuration**:
   - Ensure test environment supports drag-drop simulation
   - Add performance testing utilities if needed
   - Configure accessibility testing tools

## Success Metrics

### Functional Metrics
- [ ] Original bug reproduction test passes
- [ ] 100% of existing drag-drop functionality preserved
- [ ] Zero regression issues identified
- [ ] All new architecture features working correctly

### Performance Metrics  
- [ ] Drag operations complete within acceptable time (< 1 second)
- [ ] Memory usage remains stable
- [ ] No performance regression compared to baseline

### Quality Metrics
- [ ] Test coverage > 90% for drag-drop related code  
- [ ] All edge cases covered by tests
- [ ] Error handling tested and working
- [ ] Accessibility compliance maintained

## Definition of Done
- [ ] All acceptance criteria met
- [ ] Original bug definitively fixed with regression prevention
- [ ] Comprehensive test suite covers all scenarios
- [ ] Performance validation shows acceptable impact
- [ ] All existing functionality preserved and tested
- [ ] Architecture validation confirms improvements
- [ ] Accessibility and UX preserved
- [ ] Code review approved
- [ ] Manual testing validates complete solution
- [ ] Documentation updated with architecture changes

---
**Note**: This story validates that all previous changes work correctly together and provides comprehensive test coverage to prevent future regressions. It's the final validation step before considering the drag-drop architecture fix complete.