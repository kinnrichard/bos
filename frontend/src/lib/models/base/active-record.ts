/**
 * ActiveRecord<T> - Non-reactive Rails-compatible base class
 * 
 * Provides Promise-based CRUD operations that integrate with Zero.js
 * This class returns Promises and is suitable for:
 * - Non-Svelte contexts (Node.js, tests, utilities)
 * - Server-side operations
 * - Cases where reactive updates aren't needed
 * 
 * For reactive Svelte components, use ReactiveRecord<T> instead.
 */

import { getZero } from '../../zero/zero-client';
import type { 
  BaseRecord, 
  QueryOptions, 
  ScopedQuery, 
  CreateData, 
  UpdateData, 
  CrudResult 
} from './types';

/**
 * Configuration for ActiveRecord class
 */
export interface ActiveRecordConfig {
  /** Table name in Zero.js schema */
  tableName: string;
  /** Model class name (for error messages) */
  className: string;
  /** Primary key field name */
  primaryKey?: string;
}

/**
 * Rails RecordNotFoundError - thrown by find() when record doesn't exist
 */
export class RecordNotFoundError extends Error {
  constructor(message: string, public modelName: string, public searchCriteria: any) {
    super(message);
    this.name = 'RecordNotFoundError';
  }
  
  static forId(id: string, modelName: string): RecordNotFoundError {
    return new RecordNotFoundError(
      `Couldn't find ${modelName} with 'id'=${id}`,
      modelName,
      { id }
    );
  }
}

/**
 * Rails RecordInvalidError - thrown when validation fails
 */
export class RecordInvalidError extends Error {
  constructor(message: string, public record: any, public validationErrors: Record<string, string[]>) {
    super(message);
    this.name = 'RecordInvalidError';
  }
}

/**
 * Scoped query implementation for method chaining
 */
class ActiveRecordScopedQuery<T extends BaseRecord> implements ScopedQuery<T> {
  private conditions: Partial<T>[] = [];
  private orderByClause?: { field: keyof T; direction: 'asc' | 'desc' };
  private limitClause?: number;
  private offsetClause?: number;
  private includeDiscarded = false;
  private onlyDiscarded = false;
  
  constructor(private config: ActiveRecordConfig) {}
  
  where(conditions: Partial<T>): ScopedQuery<T> {
    const newQuery = this.clone();
    newQuery.conditions.push(conditions);
    return newQuery;
  }
  
  orderBy(field: keyof T, direction: 'asc' | 'desc' = 'asc'): ScopedQuery<T> {
    const newQuery = this.clone();
    newQuery.orderByClause = { field, direction };
    return newQuery;
  }
  
  limit(count: number): ScopedQuery<T> {
    const newQuery = this.clone();
    newQuery.limitClause = count;
    return newQuery;
  }
  
  offset(count: number): ScopedQuery<T> {
    const newQuery = this.clone();
    newQuery.offsetClause = count;
    return newQuery;
  }
  
  withDiscarded(): ScopedQuery<T> {
    const newQuery = this.clone();
    newQuery.includeDiscarded = true;
    newQuery.onlyDiscarded = false;
    return newQuery;
  }
  
  discarded(): ScopedQuery<T> {
    const newQuery = this.clone();
    newQuery.onlyDiscarded = true;
    newQuery.includeDiscarded = false;
    return newQuery;
  }
  
  kept(): ScopedQuery<T> {
    const newQuery = this.clone();
    newQuery.includeDiscarded = false;
    newQuery.onlyDiscarded = false;
    return newQuery;
  }
  
  async all(options: QueryOptions = {}): Promise<T[]> {
    return this.executeQuery(true, options) as Promise<T[]>;
  }
  
  async first(options: QueryOptions = {}): Promise<T | null> {
    const query = this.clone();
    query.limitClause = 1;
    const results = await query.executeQuery(true, options) as T[];
    return results.length > 0 ? results[0] : null;
  }
  
  async last(options: QueryOptions = {}): Promise<T | null> {
    const query = this.clone();
    // Reverse order and take first
    if (query.orderByClause) {
      query.orderByClause.direction = query.orderByClause.direction === 'asc' ? 'desc' : 'asc';
    } else {
      query.orderByClause = { field: 'created_at' as keyof T, direction: 'asc' };
    }
    query.limitClause = 1;
    const results = await query.executeQuery(true, options) as T[];
    return results.length > 0 ? results[0] : null;
  }
  
  async count(options: QueryOptions = {}): Promise<number> {
    const results = await this.executeQuery(true, options) as T[];
    return results.length;
  }
  
  async exists(options: QueryOptions = {}): Promise<boolean> {
    const count = await this.count(options);
    return count > 0;
  }
  
  private clone(): ActiveRecordScopedQuery<T> {
    const newQuery = new ActiveRecordScopedQuery<T>(this.config);
    newQuery.conditions = [...this.conditions];
    newQuery.orderByClause = this.orderByClause;
    newQuery.limitClause = this.limitClause;
    newQuery.offsetClause = this.offsetClause;
    newQuery.includeDiscarded = this.includeDiscarded;
    newQuery.onlyDiscarded = this.onlyDiscarded;
    return newQuery;
  }
  
  private async executeQuery(isCollection: boolean, options: QueryOptions = {}): Promise<T | T[] | null> {
    const zero = getZero();
    if (!zero) {
      throw new Error('Zero client not initialized');
    }
    
    const queryTable = (zero.query as any)[this.config.tableName];
    if (!queryTable) {
      throw new Error(`Table '${this.config.tableName}' not found in Zero schema`);
    }
    
    let query = queryTable;
    
    // Apply discard gem filtering
    if (this.onlyDiscarded) {
      query = query.where('discarded_at', '!=', null);
    } else if (!this.includeDiscarded) {
      query = query.where('discarded_at', null);
    }
    
    // Apply conditions
    for (const condition of this.conditions) {
      for (const [key, value] of Object.entries(condition)) {
        if (value !== undefined && value !== null) {
          query = query.where(key, value);
        }
      }
    }
    
    // Apply ordering
    if (this.orderByClause) {
      query = query.orderBy(this.orderByClause.field as string, this.orderByClause.direction);
    } else if (isCollection) {
      // Default order for collections
      query = query.orderBy('created_at', 'desc');
    }
    
    // Apply limit and offset
    if (this.limitClause) {
      query = query.limit(this.limitClause);
    }
    if (this.offsetClause) {
      query = query.offset(this.offsetClause);
    }
    
    try {
      if (isCollection) {
        const results = await query.many();
        return results || [];
      } else {
        const result = await query.one();
        return result;
      }
    } catch (error) {
      throw new Error(`Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * ActiveRecord<T> - Main Rails-compatible model base class
 * 
 * Provides Promise-based CRUD operations with Rails-like API:
 * - find(id) - find by ID, throws RecordNotFoundError if not found
 * - findBy(conditions) - find by conditions, returns null if not found  
 * - where(conditions) - scope for filtering, returns ScopedQuery
 * - all() - get all records, returns ScopedQuery
 * - create(data) - create new record
 * - update(id, data) - update existing record
 * - destroy(id) - hard delete record
 * - discard(id) - soft delete using discard gem
 * - undiscard(id) - restore discarded record
 */
export class ActiveRecord<T extends BaseRecord> {
  constructor(private config: ActiveRecordConfig) {}
  
  /**
   * Find a record by ID - Rails .find() behavior
   * Throws RecordNotFoundError if record doesn't exist
   */
  async find(id: string, options: QueryOptions = {}): Promise<T> {
    const zero = getZero();
    if (!zero) {
      throw new Error('Zero client not initialized');
    }
    
    const queryTable = (zero.query as any)[this.config.tableName];
    if (!queryTable) {
      throw new Error(`Table '${this.config.tableName}' not found in Zero schema`);
    }
    
    let query = queryTable.where('id', id);
    
    // Skip discarded_at filtering in find() - should find any record by ID
    
    try {
      const result = await query.one().run();
      if (!result) {
        throw RecordNotFoundError.forId(id, this.config.className);
      }
      return result;
    } catch (error) {
      if (error instanceof RecordNotFoundError) {
        throw error;
      }
      throw new Error(`Find failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Find a record by conditions - Rails .find_by() behavior  
   * Returns null if record doesn't exist (doesn't throw)
   */
  async findBy(conditions: Partial<T>, options: QueryOptions = {}): Promise<T | null> {
    return this.where(conditions).first(options);
  }
  
  /**
   * Create scoped query for all records - Rails .all behavior
   * Returns ScopedQuery for method chaining
   */
  all(): ScopedQuery<T> {
    return new ActiveRecordScopedQuery<T>(this.config);
  }
  
  /**
   * Create scoped query with conditions - Rails .where() behavior
   * Returns ScopedQuery for method chaining
   */
  where(conditions: Partial<T>): ScopedQuery<T> {
    return new ActiveRecordScopedQuery<T>(this.config).where(conditions);
  }
  
  /**
   * Get only kept (non-discarded) records - Rails .kept behavior
   */
  kept(): ScopedQuery<T> {
    return new ActiveRecordScopedQuery<T>(this.config).kept();
  }
  
  /**
   * Get only discarded records - Rails .discarded behavior
   */
  discarded(): ScopedQuery<T> {
    return new ActiveRecordScopedQuery<T>(this.config).discarded();
  }
  
  /**
   * Include discarded records in query - Rails .with_discarded behavior
   */
  withDiscarded(): ScopedQuery<T> {
    return new ActiveRecordScopedQuery<T>(this.config).withDiscarded();
  }
  
  /**
   * Create a new record - Rails .create() behavior
   */
  async create(data: CreateData<T>, options: QueryOptions = {}): Promise<T> {
    const zero = getZero();
    if (!zero) {
      throw new Error('Zero client not initialized');
    }
    
    const id = crypto.randomUUID();
    const now = Date.now();
    
    const fullData = {
      ...data,
      id,
      created_at: now,
      updated_at: now,
    };
    
    try {
      await (zero.mutate as any)[this.config.tableName].insert(fullData);
      return await this.find(id, { withDiscarded: true });
    } catch (error) {
      throw new Error(`Create failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Update an existing record - Rails .update() behavior
   */
  async update(id: string, data: UpdateData<T>, options: QueryOptions = {}): Promise<T> {
    const zero = getZero();
    if (!zero) {
      throw new Error('Zero client not initialized');
    }
    
    // Verify record exists first
    await this.find(id, options);
    
    const updateData = {
      ...data,
      id,
      updated_at: Date.now(),
    };
    
    try {
      await (zero.mutate as any)[this.config.tableName].update(updateData);
      return await this.find(id, { withDiscarded: true });
    } catch (error) {
      throw new Error(`Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Hard delete a record - Rails .destroy() behavior
   */
  async destroy(id: string, options: QueryOptions = {}): Promise<CrudResult> {
    const zero = getZero();
    if (!zero) {
      throw new Error('Zero client not initialized');
    }
    
    // Verify record exists first
    await this.find(id, { withDiscarded: true });
    
    try {
      await (zero.mutate as any)[this.config.tableName].delete({ id });
      return { id, success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { 
        id, 
        success: false, 
        error: `Destroy failed: ${errorMessage}` 
      };
    }
  }
  
  /**
   * Soft delete a record using discard gem - Rails .discard() behavior
   */
  async discard(id: string, options: QueryOptions = {}): Promise<T> {
    const now = Date.now();
    return this.update(id, { discarded_at: now } as UpdateData<T>, options);
  }
  
  /**
   * Restore a discarded record - Rails .undiscard() behavior
   */
  async undiscard(id: string, options: QueryOptions = {}): Promise<T> {
    return this.update(id, { discarded_at: null } as UpdateData<T>, { ...options, withDiscarded: true });
  }
  
  /**
   * Create or update a record (upsert) - Rails .find_or_create_by + update pattern
   */
  async upsert(data: (CreateData<T> & { id?: string }) | (UpdateData<T> & { id: string }), options: QueryOptions = {}): Promise<T> {
    if ('id' in data && data.id) {
      // Update existing record
      return this.update(data.id, data as UpdateData<T>, options);
    } else {
      // Create new record
      return this.create(data as CreateData<T>, options);
    }
  }
}

/**
 * Factory function to create ActiveRecord instances
 */
export function createActiveRecord<T extends BaseRecord>(config: ActiveRecordConfig): ActiveRecord<T> {
  return new ActiveRecord<T>(config);
}