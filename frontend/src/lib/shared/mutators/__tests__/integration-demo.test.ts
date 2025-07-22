/**
 * Integration Demo Test
 * Demonstrates the complete mutator pipeline working together
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { taskMutatorPipeline, executeMutatorWithTracking } from '../model-mutators';
import type { MutatorContext } from '../base-mutator';

describe('Mutator Integration Demo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should demonstrate complete task mutator pipeline', async () => {
    const data = {
      title: 'Test Task',
      job_id: 'job-123',
      description: 'This is a test task'
    };
    
    const context: MutatorContext = { 
      action: 'create',
      user: { id: 'user-456', name: 'Test User' },
      environment: 'test',
      skipActivityLogging: true // Skip for this demo
    };

    const result = await taskMutatorPipeline(data, context);

    // Verify user attribution was applied
    expect(result).toMatchObject({
      title: 'Test Task',
      job_id: 'job-123',
      description: 'This is a test task',
      created_by_id: 'user-456',
      updated_by_id: 'user-456'
    });

    // Verify positioning was applied
    expect(result.position).toBeDefined();
    expect(typeof result.position).toBe('number');
    expect(result.position).toBeGreaterThan(0);

    console.log('✅ Task mutator pipeline successfully applied:');
    console.log('   - User attribution: created_by_id and updated_by_id set');
    console.log('   - Positioning: position field set to', result.position);
    console.log('   - Activity logging: would log "created" action (skipped in test)');
  });

  it('should demonstrate update with change tracking', async () => {
    const originalData = {
      id: 'task-1',
      title: 'Original Title',
      status: 'pending',
      created_by_id: 'user-456'
    };

    const updateData = {
      id: 'task-1',
      title: 'Updated Title',
      status: 'completed'
    };
    
    const context: MutatorContext = { 
      action: 'update',
      user: { id: 'user-789', name: 'Another User' },
      environment: 'test',
      skipActivityLogging: true
    };

    const result = await executeMutatorWithTracking(
      'tasks',
      updateData,
      originalData,
      context,
      { trackChanges: true }
    );

    // Verify user attribution for updates
    expect(result.updated_by_id).toBe('user-789');
    expect(result.created_by_id).toBeUndefined(); // Should be removed for updates

    console.log('✅ Update mutator pipeline successfully applied:');
    console.log('   - User attribution: updated_by_id changed to user-789');
    console.log('   - Change tracking: would detect title and status changes');
    console.log('   - Activity logging: would log "status_changed" action (skipped in test)');
  });

  it('should demonstrate offline positioning behavior', async () => {
    const data1 = { title: 'Task 1', job_id: 'job-1' };
    const data2 = { title: 'Task 2', job_id: 'job-1' };
    const data3 = { title: 'Task 3', job_id: 'job-2' }; // Different job

    const context: MutatorContext = { 
      action: 'create',
      user: { id: 'user-123' },
      offline: true,
      environment: 'test',
      skipActivityLogging: true
    };

    const result1 = await taskMutatorPipeline(data1, context);
    const result2 = await taskMutatorPipeline(data2, context);
    const result3 = await taskMutatorPipeline(data3, context);

    // Verify scoped positioning
    expect(result1.position).toBe(1); // First task in job-1
    expect(result2.position).toBe(2); // Second task in job-1
    expect(result3.position).toBe(1); // First task in job-2

    console.log('✅ Offline positioning works correctly:');
    console.log('   - Job 1, Task 1: position', result1.position);
    console.log('   - Job 1, Task 2: position', result2.position);
    console.log('   - Job 2, Task 1: position', result3.position);
    console.log('   - Positioning is properly scoped by job_id');
  });
});