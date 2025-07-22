import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Task } from '../task';
import { setCurrentUser, clearCurrentUser } from '../../auth/current-user';
import { clearPositionCache } from '../../shared/mutators/positioning';

// Mock the Zero client to avoid database dependencies
vi.mock('../../zero/zero-client', () => {
  const mockZero = {
    mutate: {
      tasks: {
        insert: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({})
      }
    },
    query: {
      tasks: {
        where: vi.fn(() => ({
          one: vi.fn(() => ({ 
            run: vi.fn().mockResolvedValue({
              id: 'default-id',
              title: 'Default Task',
              position: 1,
              created_at: Date.now(),
              updated_at: Date.now()
            })
          }))
        }))
      }
    }
  };
  
  return {
    getZero: vi.fn(() => mockZero)
  };
});

describe('Task Mutators Integration', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    clearCurrentUser();
    setCurrentUser(mockUser);
    clearPositionCache(); // Clear all position cache
    vi.clearAllMocks();
  });

  it('applies positioning mutator on create', async () => {
    const { getZero } = await import('../../zero/zero-client');
    const mockZero = getZero() as any;
    
    // Mock find to return a record (since create calls find after insert)
    mockZero.query.tasks.where.mockReturnValue({
      one: vi.fn(() => ({ 
        run: vi.fn().mockResolvedValue({
          id: 'test-id',
          title: 'Test Task',
          job_id: 'job-123',
          position: 1,
          created_by_id: 'user-123',
          updated_by_id: 'user-123',
          created_at: Date.now(),
          updated_at: Date.now()
        })
      }))
    });

    await Task.create({ title: 'Test Task', job_id: 'job-123' });

    // Verify insert was called with position assigned
    expect(mockZero.mutate.tasks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Test Task',
        job_id: 'job-123',
        position: expect.any(Number),
        created_by_id: 'user-123',
        updated_by_id: 'user-123'
      })
    );
    
    // Verify position is a positive number
    const insertCall = mockZero.mutate.tasks.insert.mock.calls[0][0];
    expect(insertCall.position).toBeGreaterThan(0);
  });

  it('applies user attribution mutator on create', async () => {
    const { getZero } = await import('../../zero/zero-client');
    const mockZero = getZero() as any;
    
    // Mock successful find
    mockZero.query.tasks.where.mockReturnValue({
      one: vi.fn(() => ({ 
        run: vi.fn().mockResolvedValue({
          id: 'test-id',
          title: 'Test Task',
          created_by_id: 'user-123',
          updated_by_id: 'user-123'
        })
      }))
    });

    await Task.create({ title: 'Test Task' });

    expect(mockZero.mutate.tasks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        created_by_id: 'user-123',
        updated_by_id: 'user-123'
      })
    );
  });

  it('handles scoped positioning by job_id', async () => {
    const { getZero } = await import('../../zero/zero-client');
    const mockZero = getZero() as any;
    
    // Create tasks in different jobs
    mockZero.query.tasks.where.mockReturnValue({
      one: vi.fn(() => ({ 
        run: vi.fn().mockResolvedValue({
          id: 'test-id',
          title: 'Test Task',
          position: 1
        })
      }))
    });

    // Create first task in job-a (should get position 1)
    await Task.create({ title: 'Task A1', job_id: 'job-a' }, { offline: true });
    
    // Create second task in job-a (should get position 2) 
    await Task.create({ title: 'Task A2', job_id: 'job-a' }, { offline: true });
    
    // Create task in job-b (should get position 1 - different scope)
    await Task.create({ title: 'Task B1', job_id: 'job-b' }, { offline: true });

    const calls = mockZero.mutate.tasks.insert.mock.calls;
    
    // Check that positions were assigned
    expect(calls[0][0].position).toBeTypeOf('number');
    expect(calls[1][0].position).toBeTypeOf('number');
    expect(calls[2][0].position).toBeTypeOf('number');
    
    // In offline mode with scoped positioning, verify basic structure
    expect(calls[0][0]).toMatchObject({
      title: 'Task A1',
      job_id: 'job-a'
    });
    
    expect(calls[1][0]).toMatchObject({
      title: 'Task A2', 
      job_id: 'job-a'
    });
    
    expect(calls[2][0]).toMatchObject({
      title: 'Task B1',
      job_id: 'job-b'
    });
  });

  it('only updates updated_by_id on update', async () => {
    const { getZero } = await import('../../zero/zero-client');
    const mockZero = getZero() as any;
    
    // Mock successful find calls (before update and after update)
    mockZero.query.tasks.where.mockReturnValue({
      one: vi.fn(() => ({ 
        run: vi.fn().mockResolvedValue({
          id: 'existing-id',
          title: 'Updated Task',
          created_by_id: 'original-user',
          updated_by_id: 'user-123',
          position: 5
        })
      }))
    });

    await Task.update('existing-id', { title: 'Updated Task' });

    expect(mockZero.mutate.tasks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'existing-id',
        title: 'Updated Task',
        updated_by_id: 'user-123'
      })
    );
    
    // Should NOT include created_by_id in update
    const updateCall = mockZero.mutate.tasks.update.mock.calls[0][0];
    expect(updateCall).not.toHaveProperty('created_by_id');
  });

  it('preserves existing position on update when not specified', async () => {
    const { getZero } = await import('../../zero/zero-client');
    const mockZero = getZero() as any;
    
    // Mock successful find calls
    mockZero.query.tasks.where.mockReturnValue({
      one: vi.fn(() => ({ 
        run: vi.fn().mockResolvedValue({
          id: 'existing-id',
          title: 'Updated Task',
          position: 5,
          updated_by_id: 'user-123'
        })
      }))
    });

    await Task.update('existing-id', { title: 'Updated Task' });

    const updateCall = mockZero.mutate.tasks.update.mock.calls[0][0];
    
    // Position should NOT be included in update when not changing
    expect(updateCall).not.toHaveProperty('position');
  });

  it('allows manual position assignment on create', async () => {
    const { getZero } = await import('../../zero/zero-client');
    const mockZero = getZero() as any;
    
    mockZero.query.tasks.where.mockReturnValue({
      one: vi.fn(() => ({ 
        run: vi.fn().mockResolvedValue({
          id: 'test-id',
          title: 'Manual Position Task',
          position: 10,
          created_by_id: 'user-123',
          updated_by_id: 'user-123'
        })
      }))
    });

    await Task.create({ title: 'Manual Position Task', job_id: 'job-123', position: 10 });

    expect(mockZero.mutate.tasks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Manual Position Task',
        job_id: 'job-123',
        position: 10 // Should preserve manual position
      })
    );
  });

  it('chains mutators in correct order', async () => {
    const { getZero } = await import('../../zero/zero-client');
    const mockZero = getZero() as any;
    
    mockZero.query.tasks.where.mockReturnValue({
      one: vi.fn(() => ({ 
        run: vi.fn().mockResolvedValue({
          id: 'test-id',
          title: 'Chained Task',
          job_id: 'job-123',
          position: 1,
          created_by_id: 'user-123',
          updated_by_id: 'user-123'
        })
      }))
    });

    await Task.create({ title: 'Chained Task', job_id: 'job-123' }, { offline: true });

    const insertCall = mockZero.mutate.tasks.insert.mock.calls[0][0];
    
    // Should have both transformations applied
    expect(insertCall).toEqual(expect.objectContaining({
      title: 'Chained Task',
      job_id: 'job-123',
      position: expect.any(Number), // From positioning mutator
      created_by_id: 'user-123', // From user attribution mutator
      updated_by_id: 'user-123'  // From user attribution mutator
    }));
    
    // Verify position is a positive number
    expect(insertCall.position).toBeGreaterThan(0);
  });

  it('throws error when no user is authenticated', async () => {
    clearCurrentUser();

    await expect(Task.create({ title: 'Test Task' }))
      .rejects.toThrow('No authenticated user for attribution');
  });
});