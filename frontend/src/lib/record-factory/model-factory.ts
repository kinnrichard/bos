// ModelFactory: Factory pattern for creating ReactiveRecord and ActiveRecord models
// Eliminates code duplication and provides unified configuration
// Generates identical APIs for both Svelte-optimized and vanilla JS contexts

import { BaseRecord, ActiveRecordError, type QueryMeta, type BaseRecordConfig } from './base-record';
import { type ModelConfig, type FactoryCreateOptions } from './model-config';
import { getZero } from '../zero/zero-client';

/**
 * Svelte-optimized ReactiveRecord implementation
 * Uses Svelte 5 $state runes for automatic reactivity in components
 */
class ReactiveRecord<T> extends BaseRecord<T> {
  // Use Svelte 5's $state rune for proper reactivity tracking
  private _state = $state({
    data: null as T | T[] | null,
    isLoading: true,
    error: null as Error | null,
    isCollection: false
  });

  constructor(
    getQueryBuilder: () => any | null,
    config: BaseRecordConfig & { expectsCollection?: boolean } = {}
  ) {
    super(getQueryBuilder, config);
    
    this._state.data = config.defaultValue;
    this._state.isCollection = config.expectsCollection || false;
    this._state.isLoading = true;
    this._state.error = null;
    
    // Initialize Zero.js query
    this.initializeQuery();
  }

  // Reactive getters for Svelte components - automatically tracked by Svelte
  
  /** Single record access (like Rails .find result) */
  get record(): T | null {
    if (this._state.isCollection) {
      throw new ActiveRecordError('Called .record on collection query. Use .records instead.');
    }
    return this._state.data as T | null;
  }
  
  /** Collection access (like Rails .where result) */
  get records(): T[] {
    if (!this._state.isCollection) {
      throw new ActiveRecordError('Called .records on single record query. Use .record instead.');
    }
    return (this._state.data as T[]) || [];
  }
  
  /** Universal data access - returns whatever the query type expects */
  get data(): T | T[] | null {
    return this._state.data;
  }
  
  /** Loading state */
  get isLoading(): boolean {
    return this._state.isLoading;
  }
  
  /** Error state */
  get error(): Error | null {
    return this._state.error;
  }
  
  /** Check if record/collection is present (like Rails .present?) */
  get present(): boolean {
    if (this._state.isCollection) {
      return Array.isArray(this._state.data) && this._state.data.length > 0;
    }
    return this._state.data !== null && this._state.data !== undefined;
  }
  
  /** Check if record/collection is blank (like Rails .blank?) */
  get blank(): boolean {
    return !this.present;
  }

  // BaseRecord implementation
  protected handleDataUpdate(data: T | T[]): void {
    this._state.data = data;
    this._state.isLoading = false;
    this._state.error = null;
  }

  protected handleErrorUpdate(error: Error): void {
    this._state.error = error;
    this._state.isLoading = false;
  }
}

/**
 * Vanilla JS-optimized ActiveRecord implementation
 * Uses direct property access for maximum performance in non-reactive contexts
 */
class ActiveRecord<T> extends BaseRecord<T> {
  private _data: T | T[] | null = null;
  private _isLoading = true;
  private _error: Error | null = null;
  private _isCollection = false;
  private subscribers: Array<(data: T | T[] | null, meta: QueryMeta) => void> = [];

  constructor(
    getQueryBuilder: () => any | null,
    config: BaseRecordConfig & { expectsCollection?: boolean } = {}
  ) {
    super(getQueryBuilder, config);
    
    this._data = config.defaultValue;
    this._isCollection = config.expectsCollection || false;
    this._isLoading = true;
    this._error = null;
    
    // Initialize Zero.js query
    this.initializeQuery();
  }

  // Direct property access for maximum performance
  
  /** Single record access (like Rails .find result) */
  get record(): T | null {
    if (this._isCollection) {
      throw new ActiveRecordError('Called .record on collection query. Use .records instead.');
    }
    return this._data as T | null;
  }
  
  /** Collection access (like Rails .where result) */
  get records(): T[] {
    if (!this._isCollection) {
      throw new ActiveRecordError('Called .records on single record query. Use .record instead.');
    }
    return (this._data as T[]) || [];
  }
  
  /** Universal data access - returns whatever the query type expects */
  get data(): T | T[] | null {
    return this._data;
  }
  
  /** Loading state */
  get isLoading(): boolean {
    return this._isLoading;
  }
  
  /** Error state */
  get error(): Error | null {
    return this._error;
  }
  
  /** Check if record/collection is present (like Rails .present?) */
  get present(): boolean {
    if (this._isCollection) {
      return Array.isArray(this._data) && this._data.length > 0;
    }
    return this._data !== null && this._data !== undefined;
  }
  
  /** Check if record/collection is blank (like Rails .blank?) */
  get blank(): boolean {
    return !this.present;
  }

  /**
   * Subscribe to data changes (for vanilla JS usage)
   * @param callback Function called when data changes
   * @returns Unsubscribe function
   */
  subscribe(callback: (data: T | T[] | null, meta: QueryMeta) => void): () => void {
    this.subscribers.push(callback);
    
    // Immediately call with current state
    callback(this._data, this.getMeta());
    
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  // BaseRecord implementation
  protected handleDataUpdate(data: T | T[]): void {
    this._data = data;
    this._isLoading = false;
    this._error = null;
    this.notifySubscribers();
  }

  protected handleErrorUpdate(error: Error): void {
    this._error = error;
    this._isLoading = false;
    this.notifySubscribers();
  }

  private getMeta(): QueryMeta {
    return {
      isLoading: this._isLoading,
      error: this._error,
      isCollection: this._isCollection,
      present: this.present,
      blank: this.blank
    };
  }

  private notifySubscribers(): void {
    const meta = this.getMeta();
    this.subscribers.forEach(callback => {
      try {
        callback(this._data, meta);
      } catch (err) {
        console.error('ActiveRecord subscriber error:', err);
      }
    });
  }

  destroy(): void {
    super.destroy();
    this.subscribers = [];
  }
}

/**
 * Factory functions for creating optimized record instances
 */
export const ModelFactory = {
  /**
   * Create ReactiveRecord factory function for Svelte components
   * Optimized for reactive UI updates with Svelte 5 $state
   */
  createReactiveModel<T>(config: ModelConfig) {
    return {
      /**
       * Find a single record by ID (like Rails .find)
       * @param id - The record ID
       * @param options - Factory creation options
       */
      find(id: string, options: FactoryCreateOptions = {}) {
        return new ReactiveRecord<T>(
          () => {
            const zero = getZero();
            return zero ? zero.query[config.zeroConfig.tableName].where('id', id).one() : null;
          },
          {
            ...options,
            expectsCollection: false,
            defaultValue: null
          }
        );
      },

      /**
       * Find a single record by conditions (like Rails .find_by)
       * @param conditions - Object with field/value pairs to match
       * @param options - Factory creation options
       */
      findBy(conditions: Partial<T>, options: FactoryCreateOptions = {}) {
        return new ReactiveRecord<T>(
          () => {
            const zero = getZero();
            if (!zero) return null;
            
            let query = zero.query[config.zeroConfig.tableName];
            
            Object.entries(conditions).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                query = query.where(key, value);
              }
            });
            
            return query.one();
          },
          {
            ...options,
            expectsCollection: false,
            defaultValue: null
          }
        );
      },

      /**
       * Get all records (like Rails .all)
       * @param options - Factory creation options
       */
      all(options: FactoryCreateOptions = {}) {
        return new ReactiveRecord<T>(
          () => {
            const zero = getZero();
            return zero ? zero.query[config.zeroConfig.tableName].orderBy('created_at', 'desc') : null;
          },
          {
            ...options,
            expectsCollection: true,
            defaultValue: []
          }
        );
      },

      /**
       * Find records matching conditions (like Rails .where)
       * @param conditions - Object with field/value pairs to match
       * @param options - Factory creation options
       */
      where(conditions: Partial<T>, options: FactoryCreateOptions = {}) {
        return new ReactiveRecord<T>(
          () => {
            const zero = getZero();
            if (!zero) return null;
            
            let query = zero.query[config.zeroConfig.tableName];
            
            Object.entries(conditions).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                query = query.where(key, value);
              }
            });
            
            return query.orderBy('created_at', 'desc');
          },
          {
            ...options,
            expectsCollection: true,
            defaultValue: []
          }
        );
      }
    };
  },

  /**
   * Create ActiveRecord factory function for vanilla JavaScript
   * Optimized for direct property access and performance
   */
  createActiveModel<T>(config: ModelConfig) {
    return {
      /**
       * Find a single record by ID (like Rails .find)
       * @param id - The record ID
       * @param options - Factory creation options
       */
      find(id: string, options: FactoryCreateOptions = {}) {
        return new ActiveRecord<T>(
          () => {
            const zero = getZero();
            return zero ? zero.query[config.zeroConfig.tableName].where('id', id).one() : null;
          },
          {
            ...options,
            expectsCollection: false,
            defaultValue: null
          }
        );
      },

      /**
       * Find a single record by conditions (like Rails .find_by)
       * @param conditions - Object with field/value pairs to match
       * @param options - Factory creation options
       */
      findBy(conditions: Partial<T>, options: FactoryCreateOptions = {}) {
        return new ActiveRecord<T>(
          () => {
            const zero = getZero();
            if (!zero) return null;
            
            let query = zero.query[config.zeroConfig.tableName];
            
            Object.entries(conditions).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                query = query.where(key, value);
              }
            });
            
            return query.one();
          },
          {
            ...options,
            expectsCollection: false,
            defaultValue: null
          }
        );
      },

      /**
       * Get all records (like Rails .all)
       * @param options - Factory creation options
       */
      all(options: FactoryCreateOptions = {}) {
        return new ActiveRecord<T>(
          () => {
            const zero = getZero();
            return zero ? zero.query[config.zeroConfig.tableName].orderBy('created_at', 'desc') : null;
          },
          {
            ...options,
            expectsCollection: true,
            defaultValue: []
          }
        );
      },

      /**
       * Find records matching conditions (like Rails .where)
       * @param conditions - Object with field/value pairs to match
       * @param options - Factory creation options
       */
      where(conditions: Partial<T>, options: FactoryCreateOptions = {}) {
        return new ActiveRecord<T>(
          () => {
            const zero = getZero();
            if (!zero) return null;
            
            let query = zero.query[config.zeroConfig.tableName];
            
            Object.entries(conditions).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                query = query.where(key, value);
              }
            });
            
            return query.orderBy('created_at', 'desc');
          },
          {
            ...options,
            expectsCollection: true,
            defaultValue: []
          }
        );
      }
    };
  }
};

/**
 * Utility functions for factory configuration
 */
export const FactoryUtils = {
  /**
   * Create model configuration from minimal parameters
   */
  createSimpleConfig(name: string, tableName: string): ModelConfig {
    return {
      name,
      tableName,
      className: name.charAt(0).toUpperCase() + name.slice(1),
      attributes: [],
      associations: [],
      validations: [],
      scopes: [],
      zeroConfig: {
        tableName,
        primaryKey: 'id'
      }
    };
  },

  /**
   * Merge factory options with defaults
   */
  mergeOptions(options: FactoryCreateOptions = {}): Required<FactoryCreateOptions> {
    return {
      ttl: options.ttl || '1h',
      debugLogging: options.debugLogging ?? true,
      expectsCollection: options.expectsCollection || false,
      defaultValue: options.defaultValue || null,
      retryDelay: options.retryDelay || 100,
      maxRetries: options.maxRetries || 50
    };
  },

  /**
   * Validate factory configuration before creation
   */
  validateFactoryConfig(config: ModelConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!config.name) {
      errors.push('Model name is required');
    }
    
    if (!config.zeroConfig?.tableName) {
      errors.push('Zero.js table name is required');
    }
    
    return { valid: errors.length === 0, errors };
  }
};