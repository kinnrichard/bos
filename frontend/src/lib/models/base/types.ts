/**
 * Supporting types for Epic-008 ReactiveRecord implementation
 * Provides TypeScript interfaces for ActiveRecord<T> and ReactiveRecord<T> classes
 */

/**
 * Base interface that all model records must implement
 * Provides common fields available on all models
 */
export interface BaseRecord {
  id: string;
  created_at: string | number;
  updated_at: string | number;
  discarded_at?: string | number | null;
}

/**
 * Query options for controlling ActiveRecord and ReactiveRecord behavior
 */
export interface QueryOptions {
  /** Cache TTL - how long to cache results */
  ttl?: string | number;
  /** Enable debug logging for this query */
  debug?: boolean;
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Delay between retry attempts in milliseconds */
  retryDelay?: number;
  /** Include discarded records (overrides default scope) */
  withDiscarded?: boolean;
  /** Order by clause */
  orderBy?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  /** Limit number of results */
  limit?: number;
  /** Skip number of results (offset) */
  offset?: number;
}

/**
 * Reactive query interface - returned by ReactiveRecord methods
 * Provides Svelte 5 reactive state management
 */
export interface ReactiveQuery<T> {
  /** Reactive data state - automatically updates UI when data changes */
  readonly data: T | T[] | null;
  
  /** Reactive loading state - true while query is executing */
  readonly isLoading: boolean;
  
  /** Reactive error state - contains error if query failed */
  readonly error: Error | null;
  
  /** Whether this query expects a collection (array) result */
  readonly isCollection: boolean;
  
  /** Rails-style .present? - true if data is not null/empty */
  readonly present: boolean;
  
  /** Rails-style .blank? - true if data is null/empty */
  readonly blank: boolean;
  
  /** Manually refresh/refetch the query data */
  refresh(): Promise<void>;
  
  /** Clean up reactive subscriptions and destroy the query */
  destroy(): void;
  
  /** Subscribe to data changes (for non-Svelte usage) */
  subscribe(callback: (data: T | T[] | null) => void): () => void;
}

/**
 * Scoped query builder interface - used for method chaining
 * Allows Rails-like chaining: Model.where(...).order(...).limit(...)
 */
export interface ScopedQuery<T> {
  /** Filter records by conditions - returns new scoped query */
  where(conditions: Partial<T>): ScopedQuery<T>;
  
  /** Order results by field - returns new scoped query */
  orderBy(field: keyof T, direction?: 'asc' | 'desc'): ScopedQuery<T>;
  
  /** Limit number of results - returns new scoped query */
  limit(count: number): ScopedQuery<T>;
  
  /** Skip results (offset) - returns new scoped query */
  offset(count: number): ScopedQuery<T>;
  
  /** Include discarded records - returns new scoped query */
  withDiscarded(): ScopedQuery<T>;
  
  /** Only discarded records - returns new scoped query */
  discarded(): ScopedQuery<T>;
  
  /** Only kept (non-discarded) records - returns new scoped query */
  kept(): ScopedQuery<T>;
  
  // Terminal methods - execute the query
  
  /** Execute query and return all matching records */
  all(options?: QueryOptions): Promise<T[]>;
  
  /** Execute query and return first matching record */
  first(options?: QueryOptions): Promise<T | null>;
  
  /** Execute query and return last matching record */
  last(options?: QueryOptions): Promise<T | null>;
  
  /** Execute query and return count of matching records */
  count(options?: QueryOptions): Promise<number>;
  
  /** Execute query and check if any records exist */
  exists(options?: QueryOptions): Promise<boolean>;
}

/**
 * Reactive scoped query builder - same as ScopedQuery but returns ReactiveQuery
 */
export interface ReactiveScopedQuery<T> {
  /** Filter records by conditions - returns new reactive scoped query */
  where(conditions: Partial<T>): ReactiveScopedQuery<T>;
  
  /** Order results by field - returns new reactive scoped query */
  orderBy(field: keyof T, direction?: 'asc' | 'desc'): ReactiveScopedQuery<T>;
  
  /** Limit number of results - returns new reactive scoped query */
  limit(count: number): ReactiveScopedQuery<T>;
  
  /** Skip results (offset) - returns new reactive scoped query */
  offset(count: number): ReactiveScopedQuery<T>;
  
  /** Include discarded records - returns new reactive scoped query */
  withDiscarded(): ReactiveScopedQuery<T>;
  
  /** Only discarded records - returns new reactive scoped query */
  discarded(): ReactiveScopedQuery<T>;
  
  /** Only kept (non-discarded) records - returns new reactive scoped query */
  kept(): ReactiveScopedQuery<T>;
  
  // Terminal methods - return ReactiveQuery objects
  
  /** Execute query and return reactive query for all matching records */
  all(options?: QueryOptions): ReactiveQuery<T[]>;
  
  /** Execute query and return reactive query for first matching record */
  first(options?: QueryOptions): ReactiveQuery<T | null>;
  
  /** Execute query and return reactive query for last matching record */
  last(options?: QueryOptions): ReactiveQuery<T | null>;
  
  /** Execute query and return reactive query for count of matching records */
  count(options?: QueryOptions): ReactiveQuery<number>;
  
  /** Execute query and return reactive query for existence check */
  exists(options?: QueryOptions): ReactiveQuery<boolean>;
}

/**
 * Create/update data types - exclude auto-managed fields
 */
export type CreateData<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>;
export type UpdateData<T> = Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>;

/**
 * CRUD operation result
 */
export interface CrudResult {
  id: string;
  success: boolean;
  error?: string;
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}