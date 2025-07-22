import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Client } from '../client';
import { setCurrentUser, clearCurrentUser } from '../../auth/current-user';

// Mock the Zero client to avoid database dependencies
vi.mock('../../zero/zero-client', () => {
  const mockZero = {
    mutate: {
      clients: {
        insert: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({})
      }
    },
    query: {
      clients: {
        where: vi.fn(() => ({
          one: vi.fn(() => ({ 
            run: vi.fn().mockResolvedValue({
              id: 'default-id',
              name: 'Default Name',
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

describe('Client Mutators Integration', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    clearCurrentUser();
    setCurrentUser(mockUser);
    vi.clearAllMocks();
  });

  it('applies name normalization mutator on create', async () => {
    const { getZero } = await import('../../zero/zero-client');
    const mockZero = getZero() as any;
    
    // Mock find to return a record (since create calls find after insert)
    mockZero.query.clients.where.mockReturnValue({
      one: vi.fn(() => ({ 
        run: vi.fn().mockResolvedValue({
          id: 'test-id',
          name: 'Café René',
          normalized_name: 'CAFERENE',
          created_by_id: 'user-123',
          updated_by_id: 'user-123',
          created_at: Date.now(),
          updated_at: Date.now()
        })
      }))
    });

    await Client.create({ name: 'Café René' });

    // Verify insert was called with normalized data
    expect(mockZero.mutate.clients.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Café René',
        normalized_name: 'CAFERENE',
        created_by_id: 'user-123',
        updated_by_id: 'user-123'
      })
    );
  });

  it('applies user attribution mutator on create', async () => {
    const { getZero } = await import('../../zero/zero-client');
    const mockZero = getZero() as any;
    
    // Mock successful find
    mockZero.query.clients.where.mockReturnValue({
      one: vi.fn(() => ({ 
        run: vi.fn().mockResolvedValue({
          id: 'test-id',
          name: 'Test Client',
          created_by_id: 'user-123',
          updated_by_id: 'user-123'
        })
      }))
    });

    await Client.create({ name: 'Test Client' });

    expect(mockZero.mutate.clients.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        created_by_id: 'user-123',
        updated_by_id: 'user-123'
      })
    );
  });

  it('only updates updated_by_id on update', async () => {
    const { getZero } = await import('../../zero/zero-client');
    const mockZero = getZero() as any;
    
    // Mock successful find calls (before update and after update)
    mockZero.query.clients.where.mockReturnValue({
      one: vi.fn(() => ({ 
        run: vi.fn().mockResolvedValue({
          id: 'existing-id',
          name: 'Test Client',
          created_by_id: 'original-user',
          updated_by_id: 'user-123'
        })
      }))
    });

    await Client.update('existing-id', { name: 'Updated Client' });

    expect(mockZero.mutate.clients.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'existing-id',
        name: 'Updated Client',
        updated_by_id: 'user-123'
      })
    );
    
    // Should NOT include created_by_id in update
    const updateCall = mockZero.mutate.clients.update.mock.calls[0][0];
    expect(updateCall).not.toHaveProperty('created_by_id');
  });

  it('chains mutators in correct order', async () => {
    const { getZero } = await import('../../zero/zero-client');
    const mockZero = getZero() as any;
    
    mockZero.query.clients.where.mockReturnValue({
      one: vi.fn(() => ({ 
        run: vi.fn().mockResolvedValue({
          id: 'test-id',
          name: 'Café René',
          normalized_name: 'CAFERENE',
          created_by_id: 'user-123',
          updated_by_id: 'user-123'
        })
      }))
    });

    await Client.create({ name: 'Café René' });

    const insertCall = mockZero.mutate.clients.insert.mock.calls[0][0];
    
    // Should have both transformations applied
    expect(insertCall).toEqual(expect.objectContaining({
      name: 'Café René',
      normalized_name: 'CAFERENE',
      created_by_id: 'user-123',
      updated_by_id: 'user-123'
    }));
  });

  it('throws error when no user is authenticated', async () => {
    clearCurrentUser();

    await expect(Client.create({ name: 'Test Client' }))
      .rejects.toThrow('No authenticated user for attribution');
  });
});