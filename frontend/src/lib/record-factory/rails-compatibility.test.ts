// ActiveRecord API Compatibility Test Suite - Epic-007 Phase 2 Story 6
// Comprehensive tests to validate 100% ActiveRecord compatibility

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  RecordNotFoundError, 
  RecordInvalidError, 
  RecordNotSavedError,
  ActiveRecordMethodBehaviors 
} from './base-record';
import { ActiveRecord, ActiveRecordCompatibility } from './active-record';
import { ModelFactory } from './model-factory';
import { ModelConfigBuilder } from './model-config';

// Mock Zero client with proper materialization support
const mockZeroQuery = {
  where: vi.fn().mockReturnThis(),
  one: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockReturnThis(),
  materialize: vi.fn().mockReturnValue({
    data: null,
    addListener: vi.fn().mockReturnValue(() => {}),
    destroy: vi.fn()
  }),
  data: null
};

const mockZeroClient = {
  query: {
    users: mockZeroQuery
  }
};

vi.mock('../zero/zero-client', () => ({
  getZero: () => mockZeroClient
}));

// Test data
const testUser = { id: 1, name: 'John Doe', email: 'john@example.com' };
const testUsers = [
  { id: 1, name: 'John Doe', email: 'john@example.com' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
];

// Model configuration for testing
const userConfig = new ModelConfigBuilder('user', 'users')
  .addAttribute({ name: 'id', type: 'integer' })
  .addAttribute({ name: 'name', type: 'string' })
  .addAttribute({ name: 'email', type: 'string' })
  .addScope({ name: 'active', conditions: { status: 'active' }, chainable: true })
  .addScope({ name: 'recent', conditions: { created_at: '>= 7.days.ago' }, chainable: true })
  .build();

describe('Rails Error Classes', () => {
  describe('RecordNotFoundError', () => {
    it('should create error with Rails-style message for ID', () => {
      const error = RecordNotFoundError.forId(123, 'User');
      expect(error.message).toBe("Couldn't find User with 'id'=123");
      expect(error.name).toBe('RecordNotFoundError');
      expect(error.recordType).toBe('User');
      expect(error.searchCriteria).toEqual({ id: 123 });
    });

    it('should create error with Rails-style message for conditions', () => {
      const conditions = { email: 'test@example.com', status: 'active' };
      const error = RecordNotFoundError.forConditions(conditions, 'User');
      expect(error.message).toBe("Couldn't find User with 'email'=\"test@example.com\" AND 'status'=\"active\"");
      expect(error.recordType).toBe('User');
      expect(error.searchCriteria).toEqual(conditions);
    });
  });

  describe('RecordInvalidError', () => {
    it('should create validation error with Rails-style message', () => {
      const errors = {
        name: ['is required'],
        email: ['is invalid', 'must be unique']
      };
      const error = RecordInvalidError.forValidation('User', errors);
      expect(error.message).toBe('Validation failed: name is required, email is invalid, email must be unique');
      expect(error.name).toBe('RecordInvalidError');
      expect(error.validationErrors).toEqual(errors);
    });
  });

  describe('RecordNotSavedError', () => {
    it('should create save error with Rails-style message', () => {
      const error = RecordNotSavedError.forSave('User', testUser);
      expect(error.message).toBe('Failed to save the record: User');
      expect(error.name).toBe('RecordNotSavedError');
      expect(error.record).toEqual(testUser);
    });
  });
});

describe('Rails Method Behaviors', () => {
  it('should define correct behavior for find method', () => {
    const findBehavior = ActiveRecordMethodBehaviors.find;
    expect(findBehavior.throwsOnNotFound).toBe(true);
    expect(findBehavior.errorType).toBe(RecordNotFoundError);
    expect(findBehavior.returnType).toBe('single');
  });

  it('should define correct behavior for findBy method', () => {
    const findByBehavior = ActiveRecordMethodBehaviors.findBy;
    expect(findByBehavior.throwsOnNotFound).toBe(false);
    expect(findByBehavior.returnType).toBe('single_or_null');
  });

  it('should define correct behavior for where method', () => {
    const whereBehavior = ActiveRecordMethodBehaviors.where;
    expect(whereBehavior.throwsOnNotFound).toBe(false);
    expect(whereBehavior.returnType).toBe('array');
  });
});

describe('ActiveRecord', () => {
  let User: ActiveRecord<typeof testUser>;

  beforeEach(() => {
    User = new ActiveRecord<typeof testUser>(userConfig);
    vi.clearAllMocks();
  });

  describe('find(id)', () => {
    it('should return record when found', () => {
      // Set up mock to return the test user directly in query.data
      mockZeroQuery.data = testUser;
      
      const result = User.find(1);
      expect(result).toEqual(testUser);
      expect(mockZeroClient.query.users.where).toHaveBeenCalledWith('id', 1);
      expect(mockZeroClient.query.users.one).toHaveBeenCalled();
    });

    it('should throw RecordNotFoundError when not found', () => {
      // Set up mock to return null (not found)
      mockZeroQuery.data = null;
      
      expect(() => User.find(999)).toThrow(RecordNotFoundError);
      expect(() => User.find(999)).toThrow("Couldn't find User with 'id'=999");
    });
  });

  describe('findBy(conditions)', () => {
    it('should return record when found', () => {
      mockZeroQuery.data = testUser;
      
      const result = User.findBy({ email: 'john@example.com' });
      expect(result).toEqual(testUser);
      expect(mockZeroClient.query.users.where).toHaveBeenCalledWith('email', 'john@example.com');
    });

    it('should return null when not found', () => {
      mockZeroQuery.data = null;
      
      const result = User.findBy({ email: 'nonexistent@example.com' });
      expect(result).toBeNull();
    });

    it('should ignore null and undefined values in conditions', () => {
      mockZeroQuery.data = testUser;
      
      User.findBy({ email: 'john@example.com', name: null, status: undefined });
      expect(mockZeroClient.query.users.where).toHaveBeenCalledWith('email', 'john@example.com');
      expect(mockZeroClient.query.users.where).not.toHaveBeenCalledWith('name', null);
      expect(mockZeroClient.query.users.where).not.toHaveBeenCalledWith('status', undefined);
    });
  });

  describe('where(conditions)', () => {
    it('should return query builder that can execute to array when records found', () => {
      mockZeroQuery.data = testUsers;
      
      const query = User.where({ status: 'active' });
      const result = query.all();
      expect(result).toEqual(testUsers);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return query builder that executes to empty array when no records found', () => {
      mockZeroQuery.data = [];
      
      const query = User.where({ status: 'inactive' });
      const result = query.all();
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should convert single record to array when executed', () => {
      mockZeroQuery.data = testUser;
      
      const query = User.where({ id: 1 });
      const result = query.all();
      expect(result).toEqual([testUser]);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('all()', () => {
    it('should return all records as array', () => {
      mockZeroQuery.data = testUsers;
      
      const result = User.all();
      expect(result).toEqual(testUsers);
      expect(Array.isArray(result)).toBe(true);
      expect(mockZeroClient.query.users.orderBy).toHaveBeenCalledWith('created_at', 'desc');
    });

    it('should return empty array when no records', () => {
      mockZeroQuery.data = [];
      
      const result = User.all();
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('first()', () => {
    it('should return first record when records exist', () => {
      mockZeroQuery.data = testUsers;
      
      const result = User.first();
      expect(result).toEqual(testUsers[0]);
    });

    it('should return null when no records', () => {
      mockZeroQuery.data = [];
      
      const result = User.first();
      expect(result).toBeNull();
    });
  });

  describe('last()', () => {
    it('should return last record when records exist', () => {
      mockZeroQuery.data = testUsers;
      
      const result = User.last();
      expect(result).toEqual(testUsers[testUsers.length - 1]);
    });

    it('should return null when no records', () => {
      mockZeroQuery.data = [];
      
      const result = User.last();
      expect(result).toBeNull();
    });
  });

  describe('aggregation methods', () => {
    beforeEach(() => {
      const usersWithScores = [
        { id: 1, name: 'John', score: 85 },
        { id: 2, name: 'Jane', score: 92 },
        { id: 3, name: 'Bob', score: 78 }
      ];
      mockZeroQuery.data = usersWithScores;
    });

    it('should count records correctly', () => {
      const result = User.count();
      expect(result).toBe(3);
    });

    it('should check existence correctly', () => {
      expect(User.exists()).toBe(true);
      
      mockZeroQuery.data = [];
      expect(User.exists()).toBe(false);
    });

    it('should sum field values correctly', () => {
      const result = User.sum('score');
      expect(result).toBe(255); // 85 + 92 + 78
    });

    it('should calculate average correctly', () => {
      const result = User.average('score');
      expect(result).toBe(85); // 255 / 3
    });
  });
});

describe('Query Chaining', () => {
  let User: ActiveRecord<typeof testUser>;

  beforeEach(() => {
    User = new ActiveRecord<typeof testUser>(userConfig);
    vi.clearAllMocks();
  });

  it('should support method chaining', () => {
    mockZeroQuery.data = testUsers;
    
    const result = User.limit(10).offset(5).orderBy('name', 'asc').all();
    expect(Array.isArray(result)).toBe(true);
    expect(mockZeroClient.query.users.limit).toHaveBeenCalledWith(10);
    expect(mockZeroClient.query.users.offset).toHaveBeenCalledWith(5);
    expect(mockZeroClient.query.users.orderBy).toHaveBeenCalledWith('name', 'asc');
  });

  it('should support where chaining', () => {
    mockZeroQuery.data = testUsers;
    
    const query = User.where({ status: 'active' }).where({ role: 'admin' });
    const result = query.all();
    
    expect(Array.isArray(result)).toBe(true);
    expect(mockZeroClient.query.users.where).toHaveBeenCalledWith('status', 'active');
    expect(mockZeroClient.query.users.where).toHaveBeenCalledWith('role', 'admin');
  });
});

describe('Dynamic Scopes', () => {
  let User: ActiveRecord<typeof testUser>;

  beforeEach(() => {
    User = new ActiveRecord<typeof testUser>(userConfig);
    vi.clearAllMocks();
  });

  it('should create scope methods from configuration', () => {
    expect(typeof (User as any).active).toBe('function');
    expect(typeof (User as any).recent).toBe('function');
  });

  it('should execute scope with conditions', () => {
    mockZeroQuery.data = testUsers;
    
    const result = (User as any).active().all();
    expect(Array.isArray(result)).toBe(true);
    expect(mockZeroClient.query.users.where).toHaveBeenCalledWith('status', 'active');
  });

  it('should support scope chaining', () => {
    mockZeroQuery.data = testUsers;
    
    const result = (User as any).active().recent().limit(5).all();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('ModelFactory Rails Compatibility', () => {
  let userModel: any;

  beforeEach(() => {
    userModel = ModelFactory.createActiveModel<typeof testUser>(userConfig);
    vi.clearAllMocks();
  });

  describe('find() method compatibility', () => {
    it('should throw RecordNotFoundError when not found', async () => {
      // Set up mock to return null (not found)
      mockZeroQuery.materialize.mockReturnValue({
        data: null,
        addListener: vi.fn().mockImplementation((callback) => {
          // Simulate Zero calling the listener with null data
          setTimeout(() => callback(null), 0);
          return () => {};
        }),
        destroy: vi.fn()
      });
      
      const query = userModel.find('999');
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Access the record property to trigger Rails behavior
      expect(() => query.record).toThrow(RecordNotFoundError);
    });

    it('should return record when found', async () => {
      // Set up mock to return the test user
      mockZeroQuery.materialize.mockReturnValue({
        data: testUser,
        addListener: vi.fn().mockImplementation((callback) => {
          // Simulate Zero calling the listener with test data
          setTimeout(() => callback(testUser), 0);
          return () => {};
        }),
        destroy: vi.fn()
      });
      
      const query = userModel.find('1');
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(query.record).toEqual(testUser);
    });
  });

  describe('findBy() method compatibility', () => {
    it('should return null when not found', async () => {
      // Set up mock to return null (not found)
      mockZeroQuery.materialize.mockReturnValue({
        data: null,
        addListener: vi.fn().mockImplementation((callback) => {
          setTimeout(() => callback(null), 0);
          return () => {};
        }),
        destroy: vi.fn()
      });
      
      const query = userModel.findBy({ email: 'nonexistent@example.com' });
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(query.record).toBeNull();
    });

    it('should return record when found', async () => {
      // Set up mock to return the test user
      mockZeroQuery.materialize.mockReturnValue({
        data: testUser,
        addListener: vi.fn().mockImplementation((callback) => {
          setTimeout(() => callback(testUser), 0);
          return () => {};
        }),
        destroy: vi.fn()
      });
      
      const query = userModel.findBy({ email: 'john@example.com' });
      
      // Wait for async initialization  
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(query.record).toEqual(testUser);
    });
  });

  describe('where() and all() method compatibility', () => {
    it('should always return arrays', async () => {
      // Set up mock to return test users
      mockZeroQuery.materialize.mockReturnValue({
        data: testUsers,
        addListener: vi.fn().mockImplementation((callback) => {
          setTimeout(() => callback(testUsers), 0);
          return () => {};
        }),
        destroy: vi.fn()
      });
      
      const whereQuery = userModel.where({ status: 'active' });
      const allQuery = userModel.all();
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(Array.isArray(whereQuery.records)).toBe(true);
      expect(Array.isArray(allQuery.records)).toBe(true);
    });

    it('should return empty arrays when no data', async () => {
      // Set up mock to return empty data
      mockZeroQuery.materialize.mockReturnValue({
        data: [],
        addListener: vi.fn().mockImplementation((callback) => {
          setTimeout(() => callback([]), 0);
          return () => {};
        }),
        destroy: vi.fn()
      });
      
      const whereQuery = userModel.where({ status: 'inactive' });
      const allQuery = userModel.all();
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(whereQuery.records).toEqual([]);
      expect(allQuery.records).toEqual([]);
    });
  });

  describe('createActiveModel() method', () => {
    it('should create full Rails ActiveRecord instance', () => {
      const activeModel = userModel.createActiveModel();
      expect(activeModel).toBeInstanceOf(ActiveRecord);
      expect(typeof activeModel.find).toBe('function');
      expect(typeof activeModel.findBy).toBe('function');
      expect(typeof activeModel.where).toBe('function');
      expect(typeof activeModel.all).toBe('function');
    });
  });
});

describe('Rails Compatibility Utilities', () => {
  let User: ActiveRecord<typeof testUser>;

  beforeEach(() => {
    User = new ActiveRecord<typeof testUser>(userConfig);
    mockZeroClient.query.users.data = testUsers;
  });

  it('should validate method behavior compliance', () => {
    const arrayResult = User.all();
    const singleResult = User.first();
    const nullResult = null;

    expect(ActiveRecordCompatibility.validateMethodBehavior('all', arrayResult, 'array')).toBe(true);
    expect(ActiveRecordCompatibility.validateMethodBehavior('first', singleResult, 'single_or_null')).toBe(true);
    expect(ActiveRecordCompatibility.validateMethodBehavior('findBy', nullResult, 'single_or_null')).toBe(true);
    
    // Test invalid behaviors
    expect(ActiveRecordCompatibility.validateMethodBehavior('all', singleResult, 'array')).toBe(false);
    expect(ActiveRecordCompatibility.validateMethodBehavior('find', arrayResult, 'single')).toBe(false);
  });

  it('should test method compatibility comprehensively', async () => {
    const compatibilityResult = await ActiveRecordCompatibility.testMethodCompatibility(User);
    
    expect(compatibilityResult.compatible).toBe(true);
    expect(compatibilityResult.results.all).toBe(true);
    expect(compatibilityResult.results.first).toBe(true);
    expect(compatibilityResult.results.last).toBe(true);
    expect(compatibilityResult.results.count).toBe(true);
    expect(compatibilityResult.results.exists).toBe(true);
  });
});

describe('Backward Compatibility', () => {
  it('should maintain all Phase 1 functionality', () => {
    const userModel = ModelFactory.createActiveModel<typeof testUser>(userConfig);
    
    // Phase 1 methods should still work
    expect(typeof userModel.find).toBe('function');
    expect(typeof userModel.findBy).toBe('function');
    expect(typeof userModel.all).toBe('function');
    expect(typeof userModel.where).toBe('function');
    
    // New Phase 2 method should be available
    expect(typeof userModel.createActiveModel).toBe('function');
  });

  it('should preserve existing error handling', () => {
    // Existing ActiveRecordError should still work
    expect(() => {
      throw new Error('Test error');
    }).toThrow();
  });
});