import { describe, expect, it, beforeEach, vi } from 'vitest';
import { addUserAttribution } from '../user-attribution';
import { setCurrentUser, clearCurrentUser } from '../../../auth/current-user';
import type { MutatorContext } from '../base-mutator';

describe('User Attribution Mutator', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  const mockContext: MutatorContext = {
    offline: false,
    action: 'create'
  };

  beforeEach(() => {
    clearCurrentUser();
  });

  describe('for new records (no id)', () => {
    it('adds created_by_id and updated_by_id from context user', () => {
      const context = { ...mockContext, user: mockUser };
      const data = { name: 'Test Client' };
      
      const result = addUserAttribution(data, context);
      
      expect(result).toEqual({
        name: 'Test Client',
        created_by_id: 'user-123',
        updated_by_id: 'user-123'
      });
    });

    it('uses getCurrentUser when no context user provided', () => {
      setCurrentUser(mockUser);
      const data = { name: 'Test Client' };
      
      const result = addUserAttribution(data, mockContext);
      
      expect(result).toEqual({
        name: 'Test Client',
        created_by_id: 'user-123',
        updated_by_id: 'user-123'
      });
    });

    it('throws error when no authenticated user available', () => {
      const data = { name: 'Test Client' };
      
      expect(() => addUserAttribution(data, mockContext))
        .toThrow('No authenticated user for attribution');
    });
  });

  describe('for existing records (with id)', () => {
    it('only updates updated_by_id', () => {
      const context = { ...mockContext, user: mockUser, action: 'update' as const };
      const data = { 
        id: 'record-456',
        name: 'Updated Client',
        created_by_id: 'original-user'
      };
      
      const result = addUserAttribution(data, context);
      
      expect(result).toEqual({
        id: 'record-456',
        name: 'Updated Client',
        updated_by_id: 'user-123'
        // Note: created_by_id is removed to prevent overwriting
      });
    });

    it('removes created_by_id from updates to prevent overwrites', () => {
      const context = { ...mockContext, user: mockUser, action: 'update' as const };
      const data = { 
        id: 'record-456',
        created_by_id: 'should-be-removed'
      };
      
      const result = addUserAttribution(data, context);
      
      expect(result).not.toHaveProperty('created_by_id');
      expect(result.updated_by_id).toBe('user-123');
    });
  });

  describe('offline support', () => {
    it('works offline with cached user', () => {
      setCurrentUser(mockUser);
      const offlineContext = { ...mockContext, offline: true };
      const data = { name: 'Offline Record' };
      
      const result = addUserAttribution(data, offlineContext);
      
      expect(result).toEqual({
        name: 'Offline Record',
        created_by_id: 'user-123',
        updated_by_id: 'user-123'
      });
    });

    it('throws error offline without user', () => {
      const offlineContext = { ...mockContext, offline: true };
      const data = { name: 'Offline Record' };
      
      expect(() => addUserAttribution(data, offlineContext))
        .toThrow('No authenticated user for attribution');
    });
  });

  describe('context priority', () => {
    it('prefers context user over global current user', () => {
      setCurrentUser({ id: 'global-user', email: 'global@example.com' });
      const contextUser = { id: 'context-user', email: 'context@example.com' };
      const context = { ...mockContext, user: contextUser };
      const data = { name: 'Test' };
      
      const result = addUserAttribution(data, context);
      
      expect(result.created_by_id).toBe('context-user');
      expect(result.updated_by_id).toBe('context-user');
    });
  });
});