// BaseRecord: Shared Zero.js integration logic
// Provides foundation for both ReactiveRecord and ActiveRecord factories
// Eliminates code duplication between reactive query implementations

import { getZero } from '../zero/zero-client';

// Default TTL for queries when none specified
export const DEFAULT_TTL = '1h';

/**
 * Shared configuration for all records
 */
export interface BaseRecordConfig {
  ttl?: string | number;
  defaultValue?: any;
  retryDelay?: number;
  maxRetries?: number;
  debugLogging?: boolean;
}

/**
 * Query metadata for both reactive and active records
 */
export interface QueryMeta {
  isLoading: boolean;
  error: Error | null;
  isCollection: boolean;
  present: boolean;
  blank: boolean;
}

/**
 * ActiveRecord-style error class
 * Matches Rails error patterns for consistency
 */
export class ActiveRecordError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ActiveRecordError';
  }
}

/**
 * Rails-compatible RecordNotFoundError
 * Thrown when find() method cannot locate a record by ID
 */
export class RecordNotFoundError extends ActiveRecordError {
  public readonly recordType: string;
  public readonly searchCriteria: any;

  constructor(message: string, recordType: string = 'Record', searchCriteria: any = null) {
    super(message);
    this.name = 'RecordNotFoundError';
    this.recordType = recordType;
    this.searchCriteria = searchCriteria;
  }

  /**
   * Create Rails-style error message for ID not found
   */
  static forId(id: string | number, modelName: string = 'Record'): RecordNotFoundError {
    return new RecordNotFoundError(
      `Couldn't find ${modelName} with 'id'=${id}`,
      modelName,
      { id }
    );
  }

  /**
   * Create Rails-style error message for conditions not found
   */
  static forConditions(conditions: Record<string, any>, modelName: string = 'Record'): RecordNotFoundError {
    const conditionsStr = Object.entries(conditions)
      .map(([key, value]) => `'${key}'=${JSON.stringify(value)}`)
      .join(' AND ');
    
    return new RecordNotFoundError(
      `Couldn't find ${modelName} with ${conditionsStr}`,
      modelName,
      conditions
    );
  }
}

/**
 * Rails-compatible RecordInvalidError
 * Thrown when validation fails during save operations
 */
export class RecordInvalidError extends ActiveRecordError {
  public readonly record: any;
  public readonly validationErrors: Record<string, string[]>;

  constructor(message: string, record: any = null, validationErrors: Record<string, string[]> = {}) {
    super(message);
    this.name = 'RecordInvalidError';
    this.record = record;
    this.validationErrors = validationErrors;
  }

  /**
   * Create Rails-style validation error message
   */
  static forValidation(modelName: string, errors: Record<string, string[]>): RecordInvalidError {
    const errorMessages = Object.entries(errors)
      .flatMap(([field, messages]) => messages.map(msg => `${field} ${msg}`))
      .join(', ');
    
    return new RecordInvalidError(
      `Validation failed: ${errorMessages}`,
      null,
      errors
    );
  }
}

/**
 * Rails-compatible RecordNotSavedError
 * Thrown when a record fails to save without validation errors
 */
export class RecordNotSavedError extends ActiveRecordError {
  public readonly record: any;

  constructor(message: string, record: any = null) {
    super(message);
    this.name = 'RecordNotSavedError';
    this.record = record;
  }

  /**
   * Create Rails-style save error message
   */
  static forSave(modelName: string, record: any = null): RecordNotSavedError {
    return new RecordNotSavedError(
      `Failed to save the record: ${modelName}`,
      record
    );
  }
}

/**
 * Base class with shared Zero.js integration logic
 * Used by both ReactiveRecord and ActiveRecord factories
 */
export abstract class BaseRecord<T> {
  protected view: any = null;
  protected removeListener: (() => void) | null = null;
  protected retryTimeoutId: number | null = null;
  protected retryCount = 0;
  protected isDestroyed = false;
  protected config: Required<BaseRecordConfig>;

  constructor(
    protected getQueryBuilder: () => any | null,
    config: BaseRecordConfig = {}
  ) {
    // Set up default configuration
    this.config = {
      ttl: config.ttl || DEFAULT_TTL,
      defaultValue: config.defaultValue || null,
      retryDelay: config.retryDelay || 100,
      maxRetries: config.maxRetries || 50,
      debugLogging: config.debugLogging ?? (import.meta.env?.MODE !== 'production')
    };
  }

  /**
   * Initialize Zero.js materialized view with proper error handling
   */
  protected initializeQuery(): void {
    const tryInitialize = () => {
      if (this.isDestroyed) return;
      
      try {
        const queryBuilder = this.getQueryBuilder();
        
        if (!queryBuilder) {
          this.retryQuery();
          return;
        }
        
        this.createZeroView(queryBuilder);
        
      } catch (err) {
        this.handleError(err);
      }
    };
    
    tryInitialize();
  }

  /**
   * Create Zero.js materialized view with TTL validation
   */
  protected createZeroView(queryBuilder: any): void {
    const ttlValue = this.config.ttl;
    
    // Validate TTL per Zero.js documentation
    if (typeof ttlValue !== 'string' && typeof ttlValue !== 'number') {
      throw new ActiveRecordError(`Invalid TTL: ${ttlValue}. Use string like '5m' or number in ms`);
    }
    
    if (this.config.debugLogging) {
      console.log(`🔍 BaseRecord: Creating view with TTL: ${ttlValue}`);
    }
    
    this.view = queryBuilder.materialize(ttlValue);
    
    // Set up Zero's native listener for real-time updates
    this.removeListener = this.view.addListener((newData: T | T[]) => {
      if (this.isDestroyed) return;
      
      if (this.config.debugLogging) {
        const count = Array.isArray(newData) ? newData.length : (newData ? 1 : 0);
        console.log(`🔥 BaseRecord: Data updated, count: ${count}`);
      }
      
      this.handleDataUpdate(newData);
    });
    
    // Get initial data synchronously
    const initialData = this.view.data;
    if (initialData !== undefined) {
      this.handleDataUpdate(initialData);
    }
  }

  /**
   * Handle retry logic for query initialization
   */
  protected retryQuery(): void {
    if (this.retryCount >= this.config.maxRetries) {
      this.handleError(new ActiveRecordError('Max retries exceeded waiting for Zero client'));
      return;
    }
    
    this.retryCount++;
    this.handleDataUpdate(this.config.defaultValue);
    this.retryTimeoutId = setTimeout(() => this.initializeQuery(), this.config.retryDelay) as any;
  }

  /**
   * Handle errors with consistent error formatting
   */
  protected handleError(err: any): void {
    if (this.isDestroyed) return;
    
    const error = err instanceof Error ? err : new ActiveRecordError('Unknown query error');
    this.handleErrorUpdate(error);
    
    if (this.config.debugLogging) {
      console.error('🔍 BaseRecord: Error during query:', error);
    }
  }

  /**
   * Clean up Zero.js resources and prevent memory leaks
   */
  protected cleanup(): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
    
    if (this.removeListener) {
      if (this.config.debugLogging) {
        console.log('🔍 BaseRecord: Removing listener');
      }
      this.removeListener();
      this.removeListener = null;
    }
    
    if (this.view) {
      if (this.config.debugLogging) {
        console.log('🔍 BaseRecord: Destroying view');
      }
      this.view.destroy();
      this.view = null;
    }
  }

  /**
   * Destroy the query and clean up resources
   */
  destroy(): void {
    this.isDestroyed = true;
    this.cleanup();
  }

  /**
   * Reload the query (forces fresh data fetch from Zero)
   */
  reload(): void {
    if (!this.isDestroyed) {
      this.cleanup();
      this.retryCount = 0;
      this.initializeQuery();
    }
  }

  // Abstract methods that must be implemented by subclasses
  protected abstract handleDataUpdate(data: T | T[]): void;
  protected abstract handleErrorUpdate(error: Error): void;

  // Public getters for query state (implemented by subclasses)
  abstract get isLoading(): boolean;
  abstract get error(): Error | null;
  abstract get present(): boolean;
  abstract get blank(): boolean;
}

/**
 * TTL validation utilities
 */
export const TTLValidator = {
  /**
   * Validate TTL value according to Zero.js requirements
   */
  validate(ttl: string | number | undefined): string | number {
    if (ttl === undefined) {
      return DEFAULT_TTL;
    }
    
    if (typeof ttl !== 'string' && typeof ttl !== 'number') {
      throw new ActiveRecordError(`Invalid TTL: ${ttl}. Use string like '5m' or number in ms`);
    }
    
    // Additional validation for string format if needed
    if (typeof ttl === 'string' && !ttl.match(/^\d+[smhd]?$/)) {
      console.warn(`TTL format may be invalid: ${ttl}. Use format like '5m', '2h', '1d'`);
    }
    
    return ttl;
  },

  /**
   * Get default TTL
   */
  getDefault(): string {
    return DEFAULT_TTL;
  }
};

/**
 * ActiveRecord-compatible query chain interface
 * Supports method chaining like ActiveRecord: Model.scope().where().limit()
 */
export interface ActiveRecordRelation<T> {
  where(conditions: Partial<T> | Record<string, any>): ActiveRecordRelation<T>;
  limit(count: number): ActiveRecordRelation<T>;
  offset(count: number): ActiveRecordRelation<T>;
  orderBy(field: string, direction?: 'asc' | 'desc'): ActiveRecordRelation<T>;
  includes(...relations: string[]): ActiveRecordRelation<T>;
  select(...fields: string[]): ActiveRecordRelation<T>;
  distinct(): ActiveRecordRelation<T>;
  
  // Terminal methods that execute the query
  all(): T[];
  first(): T | null;
  last(): T | null;
  find(id: string | number): T;
  findBy(conditions: Partial<T>): T | null;
  count(): number;
  exists(): boolean;
  pluck(field: string): any[];
  
  // Aggregation methods
  sum(field: string): number;
  average(field: string): number;
  minimum(field: string): any;
  maximum(field: string): any;
}

/**
 * ActiveRecord scope configuration for dynamic scope generation
 * 
 * SECURITY NOTE: lambda must be a pre-defined function, not a string.
 * String-based lambdas have been removed for security reasons.
 * 
 * Migration from string scopes:
 * OLD: { lambda: "query => query.where('active', true)" }
 * NEW: { lambda: (query: any) => query.where('active', true) }
 */
export interface ActiveRecordScope {
  name: string;
  conditions?: Record<string, any>;
  lambda?: (query: any) => any;  // Function only - no string evaluation for security
  chainable: boolean;
  description?: string;
}

/**
 * ActiveRecord-compatible model interface
 * Defines the complete ActiveRecord API contract
 */
export interface ActiveRecordInterface<T> {
  // Core finder methods (ActiveRecord behavior)
  find(id: string | number): T;                    // Throws RecordNotFoundError if not found
  findBy(conditions: Partial<T>): T | null;        // Returns null if not found
  where(conditions: Partial<T>): ActiveRecordRelation<T>; // Returns query chain for chaining
  all(): T[];                                       // Returns all records
  first(): T | null;                               // First record or null
  last(): T | null;                                // Last record or null
  
  // Query building methods
  limit(count: number): ActiveRecordRelation<T>;
  offset(count: number): ActiveRecordRelation<T>;
  orderBy(field: string, direction?: 'asc' | 'desc'): ActiveRecordRelation<T>;
  
  // Aggregation methods
  count(): number;
  exists(): boolean;
  sum(field: string): number;
  average(field: string): number;
  
  // Scopes (dynamic based on Rails model configuration)
  [scopeName: string]: any;
}

/**
 * ActiveRecord method behavior configuration
 * Defines how each method should behave to match ActiveRecord exactly
 */
export const ActiveRecordMethodBehaviors = {
  /**
   * find(id) - Must throw RecordNotFoundError if not found
   */
  find: {
    throwsOnNotFound: true,
    errorType: RecordNotFoundError,
    returnType: 'single' as const
  },
  
  /**
   * findBy(conditions) - Must return null if not found
   */
  findBy: {
    throwsOnNotFound: false,
    returnType: 'single_or_null' as const
  },
  
  /**
   * where(conditions) - Must always return array
   */
  where: {
    throwsOnNotFound: false,
    returnType: 'array' as const
  },
  
  /**
   * all() - Must always return array
   */
  all: {
    throwsOnNotFound: false,
    returnType: 'array' as const
  },
  
  /**
   * first() - Must return single record or null
   */
  first: {
    throwsOnNotFound: false,
    returnType: 'single_or_null' as const
  },
  
  /**
   * last() - Must return single record or null
   */
  last: {
    throwsOnNotFound: false,
    returnType: 'single_or_null' as const
  }
} as const;

/**
 * Connection recovery utilities
 */
export const ConnectionRecovery = {
  /**
   * Check if Zero client is available
   */
  isZeroAvailable(): boolean {
    try {
      const zero = getZero();
      return zero !== null && zero !== undefined;
    } catch {
      return false;
    }
  },

  /**
   * Wait for Zero client to become available
   */
  async waitForZero(timeout: number = 5000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (this.isZeroAvailable()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return false;
  }
};