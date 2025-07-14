/**
 * ReactiveRecord<T> - Reactive Rails-compatible base class
 * 
 * Provides ReactiveQuery-based CRUD operations that integrate with Zero.js
 * This class returns ReactiveQuery objects and is suitable for:
 * - Svelte components requiring reactive state
 * - UI components that need automatic updates
 * - Cases where reactive behavior is desired
 * 
 * For non-reactive contexts, use ActiveRecord<T> instead.
 */

import { getZero } from '../../zero/zero-client';
import { ReactiveQuery } from '../../zero/reactive-query.svelte';
import type { 
  BaseRecord, 
  QueryOptions, 
  ReactiveScopedQuery, 
  ReactiveQuery as IReactiveQuery,
  CreateData, 
  UpdateData, 
  CrudResult 
} from './types';

/**
 * Configuration for ReactiveRecord class
 */
export interface ReactiveRecordConfig {
  /** Table name in Zero.js schema */
  tableName: string;
  /** Model class name (for error messages) */
  className: string;
  /** Primary key field name */
  primaryKey?: string;
  /** Default TTL for reactive queries */
  defaultTtl?: string;
}

/**
 * ReactiveQuery implementation for single records
 */
export class ReactiveQueryOne<T> implements IReactiveQuery<T> {
  private reactiveQuery: ReactiveQuery<T>;
  
  constructor(
    getQueryBuilder: () => any | null,
    defaultValue: T | null = null,
    ttl?: string
  ) {
    // Wrap single value as array for ReactiveQuery, then unwrap in getter
    this.reactiveQuery = new ReactiveQuery<T>(
      getQueryBuilder,
      defaultValue ? [defaultValue] : [],
      ttl
    );
  }
  
  get data(): T | null {
    const arrayData = this.reactiveQuery.data;
    return arrayData.length > 0 ? arrayData[0] : null;
  }
  
  get isLoading(): boolean {
    return this.reactiveQuery.isLoading;
  }
  
  get error(): Error | null {
    return this.reactiveQuery.error;
  }
  
  get isCollection(): boolean {
    return false;
  }
  
  get present(): boolean {
    return this.data !== null;
  }
  
  get blank(): boolean {
    return this.data === null;
  }
  
  async refresh(): Promise<void> {
    this.reactiveQuery.refresh();
  }
  
  destroy(): void {
    this.reactiveQuery.destroy();
  }
  
  subscribe(callback: (data: T | null) => void): () => void {
    return this.reactiveQuery.subscribe((arrayData) => {
      callback(arrayData.length > 0 ? arrayData[0] : null);
    });
  }
}

/**
 * ReactiveQuery implementation for collections
 */
export class ReactiveQueryMany<T> implements IReactiveQuery<T[]> {
  private reactiveQuery: ReactiveQuery<T>;
  
  constructor(
    getQueryBuilder: () => any | null,
    defaultValue: T[] = [],
    ttl?: string
  ) {
    this.reactiveQuery = new ReactiveQuery<T>(getQueryBuilder, defaultValue, ttl);
  }
  
  get data(): T[] {
    return this.reactiveQuery.data;
  }
  
  get isLoading(): boolean {
    return this.reactiveQuery.isLoading;
  }
  
  get error(): Error | null {
    return this.reactiveQuery.error;
  }
  
  get isCollection(): boolean {
    return true;
  }
  
  get present(): boolean {
    return this.data.length > 0;
  }
  
  get blank(): boolean {
    return this.data.length === 0;
  }
  
  async refresh(): Promise<void> {
    this.reactiveQuery.refresh();
  }
  
  destroy(): void {
    this.reactiveQuery.destroy();
  }
  
  subscribe(callback: (data: T[]) => void): () => void {
    return this.reactiveQuery.subscribe(callback);
  }
}

/**
 * Reactive scoped query implementation for method chaining
 */
class ReactiveRecordScopedQuery<T extends BaseRecord> implements ReactiveScopedQuery<T> {
  private conditions: Partial<T>[] = [];
  private orderByClause?: { field: keyof T; direction: 'asc' | 'desc' };
  private limitClause?: number;
  private offsetClause?: number;
  private includeDiscarded = false;
  private onlyDiscarded = false;
  
  constructor(private config: ReactiveRecordConfig) {}
  
  where(conditions: Partial<T>): ReactiveScopedQuery<T> {
    const newQuery = this.clone();
    newQuery.conditions.push(conditions);
    return newQuery;
  }
  
  orderBy(field: keyof T, direction: 'asc' | 'desc' = 'asc'): ReactiveScopedQuery<T> {
    const newQuery = this.clone();
    newQuery.orderByClause = { field, direction };
    return newQuery;
  }
  
  limit(count: number): ReactiveScopedQuery<T> {
    const newQuery = this.clone();
    newQuery.limitClause = count;
    return newQuery;
  }
  
  offset(count: number): ReactiveScopedQuery<T> {
    const newQuery = this.clone();
    newQuery.offsetClause = count;
    return newQuery;
  }
  
  withDiscarded(): ReactiveScopedQuery<T> {
    const newQuery = this.clone();
    newQuery.includeDiscarded = true;
    newQuery.onlyDiscarded = false;
    return newQuery;
  }
  
  discarded(): ReactiveScopedQuery<T> {
    const newQuery = this.clone();
    newQuery.onlyDiscarded = true;
    newQuery.includeDiscarded = false;
    return newQuery;
  }
  
  kept(): ReactiveScopedQuery<T> {
    const newQuery = this.clone();
    newQuery.includeDiscarded = false;
    newQuery.onlyDiscarded = false;
    return newQuery;
  }
  
  all(options: QueryOptions = {}): IReactiveQuery<T[]> {
    return new ReactiveQueryMany<T>(
      () => this.buildQuery(true),
      [],
      options.ttl?.toString() || this.config.defaultTtl
    );
  }
  
  first(options: QueryOptions = {}): IReactiveQuery<T | null> {
    const query = this.clone();
    query.limitClause = 1;
    return new ReactiveQueryOne<T>(
      () => query.buildQuery(false),
      null,
      options.ttl?.toString() || this.config.defaultTtl
    );
  }
  
  last(options: QueryOptions = {}): IReactiveQuery<T | null> {
    const query = this.clone();
    // Reverse order and take first
    if (query.orderByClause) {
      query.orderByClause.direction = query.orderByClause.direction === 'asc' ? 'desc' : 'asc';
    } else {
      query.orderByClause = { field: 'created_at' as keyof T, direction: 'asc' };
    }
    query.limitClause = 1;
    return new ReactiveQueryOne<T>(
      () => query.buildQuery(false),
      null,
      options.ttl?.toString() || this.config.defaultTtl
    );
  }
  
  count(options: QueryOptions = {}): IReactiveQuery<number> {
    return new ReactiveQueryOne<number>(
      () => {
        const query = this.buildQuery(true);
        return query ? {
          ...query,
          many: async () => {
            const results = await query.many();
            return [results ? results.length : 0];
          }
        } : null;
      },
      0,
      options.ttl?.toString() || this.config.defaultTtl
    );
  }
  
  exists(options: QueryOptions = {}): IReactiveQuery<boolean> {
    return new ReactiveQueryOne<boolean>(
      () => {
        const query = this.buildQuery(true);
        return query ? {
          ...query,
          many: async () => {
            const results = await query.many();
            return [results && results.length > 0];
          }
        } : null;
      },
      false,
      options.ttl?.toString() || this.config.defaultTtl
    );
  }
  
  private clone(): ReactiveRecordScopedQuery<T> {
    const newQuery = new ReactiveRecordScopedQuery<T>(this.config);
    newQuery.conditions = [...this.conditions];
    newQuery.orderByClause = this.orderByClause;
    newQuery.limitClause = this.limitClause;
    newQuery.offsetClause = this.offsetClause;
    newQuery.includeDiscarded = this.includeDiscarded;
    newQuery.onlyDiscarded = this.onlyDiscarded;
    return newQuery;
  }
  
  private buildQuery(isCollection: boolean): any | null {
    const zero = getZero();
    if (!zero) {
      return null;
    }
    
    const queryTable = (zero.query as any)[this.config.tableName];
    if (!queryTable) {
      return null;
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
    
    return query;
  }
}

/**
 * ReactiveRecord<T> - Main Rails-compatible reactive model base class
 * 
 * Provides ReactiveQuery-based CRUD operations with Rails-like API:
 * - find(id) - find by ID, returns ReactiveQuery<T | null>
 * - findBy(conditions) - find by conditions, returns ReactiveQuery<T | null>
 * - where(conditions) - scope for filtering, returns ReactiveScopedQuery<T>
 * - all() - get all records, returns ReactiveScopedQuery<T>
 * - kept() - get non-discarded records, returns ReactiveScopedQuery<T>
 * - discarded() - get discarded records, returns ReactiveScopedQuery<T>
 * - withDiscarded() - include discarded records, returns ReactiveScopedQuery<T>
 */
export class ReactiveRecord<T extends BaseRecord> {
  constructor(private config: ReactiveRecordConfig) {}
  
  /**
   * Find a record by ID - Rails .find() behavior
   * Returns ReactiveQuery that will be null if record doesn't exist
   */
  find(id: string, options: QueryOptions = {}): IReactiveQuery<T | null> {
    return new ReactiveQueryOne<T>(
      () => {
        const zero = getZero();
        if (!zero) {
          return null;
        }
        
        const queryTable = (zero.query as any)[this.config.tableName];
        if (!queryTable) {
          return null;
        }
        
        let query = queryTable.where('id', id);
        
        // Apply discard gem filtering unless withDiscarded is specified
        if (!options.withDiscarded) {
          query = query.where('discarded_at', null);
        }
        
        return query;
      },
      null,
      options.ttl?.toString() || this.config.defaultTtl
    );
  }
  
  /**
   * Find a record by conditions - Rails .find_by() behavior  
   * Returns ReactiveQuery<T | null>
   */
  findBy(conditions: Partial<T>, options: QueryOptions = {}): IReactiveQuery<T | null> {
    return this.where(conditions).first(options);
  }
  
  /**
   * Create reactive scoped query for all records - Rails .all behavior
   * Returns ReactiveScopedQuery for method chaining
   */
  all(): ReactiveScopedQuery<T> {
    return new ReactiveRecordScopedQuery<T>(this.config);
  }
  
  /**
   * Create reactive scoped query with conditions - Rails .where() behavior
   * Returns ReactiveScopedQuery for method chaining
   */
  where(conditions: Partial<T>): ReactiveScopedQuery<T> {
    return new ReactiveRecordScopedQuery<T>(this.config).where(conditions);
  }
  
  /**
   * Get only kept (non-discarded) records - Rails .kept behavior
   */
  kept(): ReactiveScopedQuery<T> {
    return new ReactiveRecordScopedQuery<T>(this.config).kept();
  }
  
  /**
   * Get only discarded records - Rails .discarded behavior
   */
  discarded(): ReactiveScopedQuery<T> {
    return new ReactiveRecordScopedQuery<T>(this.config).discarded();
  }
  
  /**
   * Include discarded records in query - Rails .with_discarded behavior
   */
  withDiscarded(): ReactiveScopedQuery<T> {
    return new ReactiveRecordScopedQuery<T>(this.config).withDiscarded();
  }
}

/**
 * Factory function to create ReactiveRecord instances
 */
export function createReactiveRecord<T extends BaseRecord>(config: ReactiveRecordConfig): ReactiveRecord<T> {
  return new ReactiveRecord<T>(config);
}