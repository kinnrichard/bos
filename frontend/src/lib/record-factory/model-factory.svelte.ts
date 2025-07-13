// ModelFactory: Factory pattern for creating ReactiveRecord and ActiveRecord models
// Eliminates code duplication and provides unified configuration
// Generates identical APIs for both Svelte-optimized and vanilla JS contexts

import { 
  BaseRecord, 
  ActiveRecordError, 
  RecordNotFoundError,
  RecordInvalidError,
  RecordNotSavedError,
  type QueryMeta, 
  type BaseRecordConfig,
  type RailsModelInterface 
} from './base-record';
import { type ModelConfig, type FactoryCreateOptions } from './model-config';
import { getZero } from '../zero/zero-client';
import { RailsActiveRecord, createRailsActiveRecord } from './rails-active-record';

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
 * Rails-Compatible ActiveRecord implementation
 * Extends BaseRecord with 100% Rails ActiveRecord API compatibility
 * Maintains backward compatibility while adding Rails method behaviors
 */
class ActiveRecord<T> extends BaseRecord<T> {
  private _data: T | T[] | null = null;
  private _isLoading = true;
  private _error: Error | null = null;
  private _isCollection = false;
  private _railsThrowOnNotFound = false;
  private _modelName = 'Record';
  private subscribers: Array<(data: T | T[] | null, meta: QueryMeta) => void> = [];

  constructor(
    getQueryBuilder: () => any | null,
    config: BaseRecordConfig & { 
      expectsCollection?: boolean;
      railsThrowOnNotFound?: boolean;
      modelName?: string;
    } = {}
  ) {
    super(getQueryBuilder, config);
    
    this._data = config.defaultValue;
    this._isCollection = config.expectsCollection || false;
    this._railsThrowOnNotFound = config.railsThrowOnNotFound || false;
    this._modelName = config.modelName || 'Record';
    this._isLoading = true;
    this._error = null;
    
    // Initialize Zero.js query
    this.initializeQuery();
  }

  // Rails-compatible data access with proper error handling
  
  /** Single record access (like Rails .find result) */
  get record(): T | null {
    if (this._isCollection) {
      throw new ActiveRecordError('Called .record on collection query. Use .records instead.');
    }
    
    // Rails find() behavior - throw if not found and configured to do so
    if (this._railsThrowOnNotFound && !this._data && !this._isLoading && !this._error) {
      throw new RecordNotFoundError(`Couldn't find ${this._modelName}`, this._modelName);
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
       * Rails-style includes for relationships (supports chaining)
       * @param relations - Relationship names to include
       */
      includes(...relations: string[]) {
        console.log(`🔍 [Factory] includes() called with relations:`, relations);
        
        return {
          /**
           * Get all records with included relationships (like Rails .includes().all)
           * @param options - Factory creation options
           */
          all(options: FactoryCreateOptions = {}) {
            console.log(`🔍 [Factory] includes().all() called`);
            return new ReactiveRecord<T>(
              () => {
                const zero = getZero();
                console.log(`🔍 [Factory] getZero() result:`, zero ? 'available' : 'null');
                if (!zero) return null;
                
                let query = zero.query[config.zeroConfig.tableName];
                console.log(`🔍 [Factory] Base query for table ${config.zeroConfig.tableName}:`, query);
                
                // Apply relationships using Zero.js .related() method
                relations.forEach(relation => {
                  console.log(`🔍 [Factory] Applying relation: ${relation}`);
                  query = query.related(relation);
                });
                
                // Apply default ordering
                const finalQuery = query.orderBy('created_at', 'desc');
                console.log(`🔍 [Factory] Final query with relations:`, finalQuery);
                
                return finalQuery;
              },
              {
                ...options,
                expectsCollection: true,
                defaultValue: []
              }
            );
          },

          /**
           * Find single record with included relationships (like Rails .includes().find)
           * @param id - The record ID
           * @param options - Factory creation options
           */
          find(id: string, options: FactoryCreateOptions = {}) {
            console.log(`🔍 [Factory] includes().find(${id}) called`);
            return new ReactiveRecord<T>(
              () => {
                const zero = getZero();
                if (!zero) return null;
                
                let query = zero.query[config.zeroConfig.tableName].where('id', id);
                
                // Apply relationships using Zero.js .related() method
                relations.forEach(relation => {
                  query = query.related(relation);
                });
                
                return query.one();
              },
              {
                ...options,
                expectsCollection: false,
                defaultValue: null
              }
            );
          }
        };
      },
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
   * Create Rails-Compatible ActiveRecord factory function
   * Implements 100% Rails ActiveRecord API compatibility
   */
  createActiveModel<T>(config: ModelConfig) {
    return {
      /**
       * Find a single record by ID (Rails .find behavior - throws RecordNotFoundError if not found)
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
            defaultValue: null,
            railsThrowOnNotFound: true,
            modelName: config.className
          }
        );
      },

      /**
       * Find a single record by conditions (Rails .find_by behavior - returns null if not found)
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
            defaultValue: null,
            railsThrowOnNotFound: false,  // findBy returns null, doesn't throw
            modelName: config.className
          }
        );
      },

      /**
       * Get all records (Rails .all behavior - always returns array)
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
            defaultValue: [],
            railsThrowOnNotFound: false,  // Collections never throw
            modelName: config.className
          }
        );
      },

      /**
       * Find records matching conditions (Rails .where behavior - always returns array)
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
            defaultValue: [],
            railsThrowOnNotFound: false,  // Collections never throw
            modelName: config.className
          }
        );
      },

      /**
       * Create Rails-compatible model with full API (new in Phase 2)
       * Returns full Rails ActiveRecord interface with method chaining and scopes
       */
      createRailsModel(): RailsActiveRecord<T> {
        return createRailsActiveRecord<T>(config);
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