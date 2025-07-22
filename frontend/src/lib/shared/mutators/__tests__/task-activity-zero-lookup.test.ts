import { describe, it, expect, vi, beforeEach } from 'vitest';
import { taskActivityLoggingMutator } from '../activity-logging';
import type { MutatorContext } from '../../base-mutator';

// Mock the modules
vi.mock('../../../models/job', () => ({
  Job: {
    findBy: vi.fn()
  }
}));

vi.mock('../../../models/activity-log', () => ({
  ActivityLog: {
    create: vi.fn().mockResolvedValue({ id: 'activity-123' })
  }
}));

vi.mock('../../../auth/current-user', () => ({
  getCurrentUser: vi.fn().mockReturnValue({ id: 'user-123', name: 'Test User' })
}));

describe('Task Activity Logging with Zero.js Lookup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch client_id from job using Zero.js lookup', async () => {
    const { Job } = await import('../../../models/job');
    const { ActivityLog } = await import('../../../models/activity-log');
    
    // Mock job lookup to return a job with client_id
    vi.mocked(Job.findBy).mockResolvedValue({
      id: 'job-456',
      client_id: 'client-789',
      title: 'Test Job'
    } as any);
    
    // Task data with job_id but no client_id
    const taskData = {
      id: 'task-123',
      title: 'Test Task',
      job_id: 'job-456',
      status: 'new_task'
    };
    
    const context: MutatorContext = {
      action: 'update',
      changes: {
        title: ['Old Title', 'Test Task']
      }
    };
    
    // Execute mutator
    await taskActivityLoggingMutator(taskData, context);
    
    // Verify Job.findBy was called with correct ID
    expect(Job.findBy).toHaveBeenCalledWith({ id: 'job-456' });
    
    // Verify activity log was created with client_id from job
    expect(ActivityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-123',
        action: 'updated',
        loggable_type: 'Task',
        loggable_id: 'task-123',
        client_id: 'client-789', // From the job lookup
        job_id: 'job-456'
      })
    );
  });

  it('should handle missing job gracefully', async () => {
    const { Job } = await import('../../../models/job');
    const { ActivityLog } = await import('../../../models/activity-log');
    
    // Mock job lookup to return null
    vi.mocked(Job.findBy).mockResolvedValue(null);
    
    const taskData = {
      id: 'task-123',
      title: 'Orphan Task',
      job_id: 'non-existent-job',
      status: 'new_task'
    };
    
    const context: MutatorContext = {
      action: 'update',
      changes: {
        status: ['new_task', 'in_progress']
      }
    };
    
    // Execute mutator
    await taskActivityLoggingMutator(taskData, context);
    
    // Verify activity log was created without client_id
    expect(ActivityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-123',
        action: 'status_changed',
        loggable_type: 'Task',
        loggable_id: 'task-123',
        client_id: null, // No client_id since job not found
        job_id: 'non-existent-job'
      })
    );
  });

  it('should handle task without job_id', async () => {
    const { Job } = await import('../../../models/job');
    const { ActivityLog } = await import('../../../models/activity-log');
    
    const taskData = {
      id: 'task-123',
      title: 'Task Without Job',
      // No job_id
      status: 'new_task'
    };
    
    const context: MutatorContext = {
      action: 'create'
    };
    
    // Execute mutator
    await taskActivityLoggingMutator(taskData, context);
    
    // Verify Job.findBy was NOT called
    expect(Job.findBy).not.toHaveBeenCalled();
    
    // Verify activity log was created without client_id or job_id
    expect(ActivityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-123',
        action: 'created',
        loggable_type: 'Task',
        loggable_id: 'task-123',
        client_id: null,
        job_id: null,
        metadata: expect.objectContaining({
          name: 'Task Without Job'
        })
      })
    );
  });

  it('should handle Zero.js lookup errors gracefully', async () => {
    const { Job } = await import('../../../models/job');
    const { ActivityLog } = await import('../../../models/activity-log');
    
    // Mock job lookup to throw an error
    vi.mocked(Job.findBy).mockRejectedValue(new Error('Zero client not available'));
    
    const taskData = {
      id: 'task-123',
      title: 'Task with Error',
      job_id: 'job-456',
      status: 'new_task'
    };
    
    const context: MutatorContext = {
      action: 'update',
      changes: {
        title: ['Old', 'Task with Error']
      }
    };
    
    // Execute mutator - should not throw
    await taskActivityLoggingMutator(taskData, context);
    
    // Verify activity log was still created, just without client_id
    expect(ActivityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-123',
        action: 'updated',
        loggable_type: 'Task',
        loggable_id: 'task-123',
        client_id: null, // Null due to error
        job_id: 'job-456'
      })
    );
  });
});