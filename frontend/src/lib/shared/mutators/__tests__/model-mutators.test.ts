/**
 * Model Mutator Pipeline Tests
 * 
 * Tests the complete mutator pipeline integration including:
 * - User attribution + positioning + activity logging for tasks
 * - User attribution + activity logging for jobs/clients
 * - Change tracking and context building
 * - Mutator execution order and data flow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  taskMutatorPipeline,
  jobMutatorPipeline,
  clientMutatorPipeline,
  executeMutatorWithTracking,
  getMutatorForModel,
  MODEL_MUTATORS
} from '../model-mutators';
import type { MutatorContext } from '../base-mutator';

// Mock dependencies
vi.mock('../../auth/current-user', () => ({
  getCurrentUser: vi.fn(() => ({ id: 'user-123', name: 'Test User' }))
}));

vi.mock('../../models/activity-log', () => ({
  ActivityLog: {
    create: vi.fn()
  }
}));

describe('Model Mutator Pipelines', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('taskMutatorPipeline', () => {
    it('should apply user attribution, positioning, and activity logging', async () => {
      const data = {
        title: 'Test Task',
        job_id: 'job-1',
        description: 'Task description'
      };
      const context: MutatorContext = { 
        action: 'create',
        user: { id: 'user-123', name: 'Test User' }
      };

      const result = await taskMutatorPipeline(data, context);

      // Should have user attribution
      expect(result).toMatchObject({
        title: 'Test Task',
        job_id: 'job-1',
        description: 'Task description',
        created_by_id: 'user-123',
        updated_by_id: 'user-123'
      });

      // Should have positioning (timestamp-based for new records)
      expect(result.position).toBeDefined();
      expect(typeof result.position).toBe('number');

      // Should have logged activity
      const { ActivityLog } = await import('../../models/activity-log');
      expect(ActivityLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          action: 'created',
          loggable_type: 'Task'
        })
      );
    });

    it('should handle updates with change tracking', async () => {
      const data = {
        id: 'task-1',
        title: 'Updated Task',
        status: 'completed'
      };
      const originalData = {
        id: 'task-1',
        title: 'Original Task',
        status: 'pending',
        created_by_id: 'user-123'
      };
      const context: MutatorContext = { 
        action: 'update',
        user: { id: 'user-456', name: 'Another User' }
      };

      const result = await executeMutatorWithTracking(
        'tasks',
        data,
        originalData,
        context,
        { trackChanges: true }
      );

      // Should update user attribution (updated_by only)
      expect(result).toMatchObject({
        id: 'task-1',
        title: 'Updated Task',
        status: 'completed',
        updated_by_id: 'user-456'
      });
      expect(result.created_by_id).toBeUndefined(); // Should be removed for updates

      // Should have logged activity with changes
      const { ActivityLog } = await import('../../models/activity-log');
      expect(ActivityLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-456',
          action: 'status_changed', // Status changes get special handling
          loggable_type: 'Task',
          metadata: expect.objectContaining({
            changes: {
              title: ['Original Task', 'Updated Task'],
              status: ['pending', 'completed']
            },
            old_status: 'pending',
            new_status: 'completed'
          })
        })
      );
    });

    it('should handle positioning for scoped tasks', async () => {
      const data = {
        title: 'Task in Job',
        job_id: 'job-1'
      };
      const context: MutatorContext = { 
        action: 'create',
        offline: true // Test offline positioning
      };

      const result = await taskMutatorPipeline(data, context);

      // Should have job-scoped position
      expect(result.position).toBe(1); // First task in offline cache
      expect(result.job_id).toBe('job-1');
    });
  });

  describe('jobMutatorPipeline', () => {
    it('should apply user attribution and activity logging', async () => {
      const data = {
        title: 'Test Job',
        client_id: 'client-1',
        description: 'Job description'
      };
      const context: MutatorContext = { 
        action: 'create',
        user: { id: 'user-123', name: 'Test User' }
      };

      const result = await jobMutatorPipeline(data, context);

      // Should have user attribution
      expect(result).toMatchObject({
        title: 'Test Job',
        client_id: 'client-1',
        description: 'Job description',
        created_by_id: 'user-123',
        updated_by_id: 'user-123'
      });

      // Should NOT have positioning (jobs don't use positioning)
      expect(result.position).toBeUndefined();

      // Should have logged activity
      const { ActivityLog } = await import('../../models/activity-log');
      expect(ActivityLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          action: 'created',
          loggable_type: 'Job',
          client_id: 'client-1',
          job_id: expect.any(String) // Should be the job's own ID
        })
      );
    });
  });

  describe('clientMutatorPipeline', () => {
    it('should apply user attribution and activity logging', async () => {
      const data = {
        name: 'Test Client',
        email: 'test@example.com',
        business: true
      };
      const context: MutatorContext = { 
        action: 'create',
        user: { id: 'user-123', name: 'Test User' }
      };

      const result = await clientMutatorPipeline(data, context);

      // Should have user attribution
      expect(result).toMatchObject({
        name: 'Test Client',
        email: 'test@example.com',
        business: true,
        created_by_id: 'user-123',
        updated_by_id: 'user-123'
      });

      // Should have logged activity
      const { ActivityLog } = await import('../../models/activity-log');
      expect(ActivityLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          action: 'created',
          loggable_type: 'Client',
          client_id: expect.any(String) // Should be the client's own ID
        })
      );
    });
  });

  describe('executeMutatorWithTracking', () => {
    it('should build change tracking correctly', async () => {
      const data = {
        id: 'task-1',
        title: 'New Title',
        status: 'completed',
        position: 5,
        updated_at: Date.now()
      };
      const originalData = {
        id: 'task-1',
        title: 'Old Title',
        status: 'pending',
        position: 3,
        updated_at: Date.now() - 1000
      };
      const context: MutatorContext = { action: 'update' };

      await executeMutatorWithTracking(
        'tasks',
        data,
        originalData,
        context,
        { trackChanges: true }
      );

      const { ActivityLog } = await import('../../models/activity-log');
      expect(ActivityLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            changes: {
              title: ['Old Title', 'New Title'],
              status: ['pending', 'completed'],
              position: [3, 5],
              updated_at: [originalData.updated_at, data.updated_at]
            }
          })
        })
      );
    });

    it('should skip change tracking when disabled', async () => {
      const data = { id: 'task-1', title: 'New Title' };
      const originalData = { id: 'task-1', title: 'Old Title' };
      const context: MutatorContext = { action: 'update' };

      await executeMutatorWithTracking(
        'tasks',
        data,
        originalData,
        context,
        { trackChanges: false }
      );

      const { ActivityLog } = await import('../../models/activity-log');
      expect(ActivityLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.not.objectContaining({
            changes: expect.anything()
          })
        })
      );
    });

    it('should include custom metadata', async () => {
      const data = { id: 'task-1', title: 'Test Task' };
      const context: MutatorContext = { 
        action: 'create',
        metadata: { source: 'api', batch_id: 'batch-123' }
      };

      await executeMutatorWithTracking(
        'tasks',
        data,
        null,
        context,
        { 
          metadata: { operation: 'bulk_import' }
        }
      );

      const { ActivityLog } = await import('../../models/activity-log');
      expect(ActivityLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            source: 'api',
            batch_id: 'batch-123',
            operation: 'bulk_import'
          })
        })
      );
    });
  });

  describe('getMutatorForModel', () => {
    it('should return correct mutator for known models', () => {
      expect(getMutatorForModel('tasks')).toBe(taskMutatorPipeline);
      expect(getMutatorForModel('jobs')).toBe(jobMutatorPipeline);
      expect(getMutatorForModel('clients')).toBe(clientMutatorPipeline);
    });

    it('should return null for unknown models', () => {
      expect(getMutatorForModel('unknown_table')).toBeNull();
    });

    it('should return generic mutator for supported models', () => {
      expect(getMutatorForModel('devices')).toBeDefined();
      expect(getMutatorForModel('people')).toBeDefined();
      expect(getMutatorForModel('notes')).toBeDefined();
    });

    it('should have passthrough for activity_logs', () => {
      const activityLogMutator = getMutatorForModel('activity_logs');
      expect(activityLogMutator).toBeDefined();
      
      // Should be a passthrough (no mutation)
      const data = { id: 'log-1', action: 'test' };
      const result = activityLogMutator!(data, { action: 'create' });
      expect(result).toBe(data);
    });
  });

  describe('MODEL_MUTATORS registry', () => {
    it('should contain all expected model mutators', () => {
      const expectedModels = [
        'tasks', 'jobs', 'clients', 'users',
        'devices', 'people', 'scheduled_date_times', 'notes',
        'activity_logs'
      ];

      expectedModels.forEach(model => {
        expect(MODEL_MUTATORS[model]).toBeDefined();
        expect(typeof MODEL_MUTATORS[model]).toBe('function');
      });
    });
  });

  describe('Mutator pipeline order', () => {
    it('should execute mutators in correct order for tasks', async () => {
      const executionOrder: string[] = [];
      
      // Mock each mutator to track execution order
      const { addUserAttribution } = await import('../user-attribution');
      const { taskPositioningMutator } = await import('../positioning');
      const { taskActivityLoggingMutator } = await import('../activity-logging');
      
      const originalUserAttribution = addUserAttribution;
      const originalPositioning = taskPositioningMutator;
      const originalActivity = taskActivityLoggingMutator;
      
      vi.doMock('../user-attribution', () => ({
        addUserAttribution: vi.fn((data, context) => {
          executionOrder.push('user-attribution');
          return originalUserAttribution(data, context);
        })
      }));
      
      vi.doMock('../positioning', () => ({
        taskPositioningMutator: vi.fn((data, context) => {
          executionOrder.push('positioning');
          return originalPositioning(data, context);
        })
      }));
      
      vi.doMock('../activity-logging', () => ({
        taskActivityLoggingMutator: vi.fn((data, context) => {
          executionOrder.push('activity-logging');
          return originalActivity(data, context);
        })
      }));
      
      const data = { title: 'Test Task', job_id: 'job-1' };
      const context: MutatorContext = { action: 'create' };
      
      await taskMutatorPipeline(data, context);
      
      expect(executionOrder).toEqual([
        'user-attribution',
        'positioning', 
        'activity-logging'
      ]);
    });
  });
});