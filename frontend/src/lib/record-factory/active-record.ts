// High-Performance ActiveRecord Implementation - Epic-007 Story 5
// Vanilla JS-optimized with direct property access for maximum performance
// Property access within 2x of direct object access speed

import { getZero } from '../zero/zero-client';
import { ZERO_CONFIG } from '../zero/zero-config';
import { zeroErrorHandler, type ErrorContext } from '../zero/zero-errors';

/**
 * High-performance ActiveRecord instance configuration
 */
export interface ActiveRecordConfig {
  ttl?: string | number;
  debugLogging?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  enableSubscriptions?: boolean;
}

/**
 * Subscription callback for manual reactivity
 */
export type SubscriptionCallback<T> = (data: T | T[] | null, meta: {
  isLoading: boolean;
  error: Error | null;
  count: number;
}) => void;

/**
 * High-Performance ActiveRecord Instance
 * Optimized for vanilla JS with direct property access (no getters)
 * Manual subscription available when reactivity needed
 */
export class ActiveRecordInstance<T> {
  // Direct property access for maximum performance (no getters)
  public data: T | T[] | null = null;
  public isLoading: boolean = true;
  public error: Error | null = null;
  public isCollection: boolean = false;
  
  // Memory-optimized private properties
  private view: any = null;
  private removeListener: (() => void) | null = null;
  private subscribers: SubscriptionCallback<T>[] = [];
  private retryCount = 0;
  private isDestroyed = false;
  private config: Required<ActiveRecordConfig>;
  private operationId: string;

  constructor(
    private getQueryBuilder: () => any | null,
    config: ActiveRecordConfig & { expectsCollection?: boolean } = {}
  ) {
    // Optimized configuration setup - minimal object creation
    this.config = {
      ttl: config.ttl || ZERO_CONFIG.query.DEFAULT_TTL,
      debugLogging: config.debugLogging ?? ZERO_CONFIG.query.DEBUG_LOGGING,
      maxRetries: config.maxRetries || ZERO_CONFIG.query.MAX_RETRIES,
      retryDelay: config.retryDelay || ZERO_CONFIG.query.RETRY_DELAY,
      enableSubscriptions: config.enableSubscriptions ?? true
    };
    
    this.isCollection = config.expectsCollection || false;
    this.operationId = `activerecord-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    // Initialize immediately for performance
    this.initializeQuery();
  }

  /**
   * Manual subscription for reactivity when needed
   * Returns unsubscribe function
   */
  subscribe(callback: SubscriptionCallback<T>): () => void {
    if (!this.config.enableSubscriptions) {
      throw new Error('Subscriptions disabled for this ActiveRecord instance');
    }
    
    this.subscribers.push(callback);
    
    // Immediately call with current state
    callback(this.data, {
      isLoading: this.isLoading,
      error: this.error,
      count: this.getCount()
    });
    
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Rails-compatible presence check (.present?)
   */
  get present(): boolean {
    if (this.isCollection) {
      return Array.isArray(this.data) && this.data.length > 0;
    }
    return this.data !== null && this.data !== undefined;
  }

  /**
   * Rails-compatible blank check (.blank?)
   */
  get blank(): boolean {
    return !this.present;
  }

  /**
   * Get record count (performance optimized)
   */
  getCount(): number {
    if (!this.data) return 0;
    return Array.isArray(this.data) ? this.data.length : 1;
  }

  /**
   * Rails-compatible reload method
   */
  reload(): void {
    if (this.isDestroyed) return;
    
    this.cleanup();
    this.retryCount = 0;
    this.isLoading = true;
    this.error = null;
    this.notifySubscribers();
    this.initializeQuery();
  }

  /**
   * Destroy and cleanup all resources
   */
  destroy(): void {
    this.isDestroyed = true;
    this.cleanup();
    this.subscribers = [];
  }

  // Private implementation methods

  private async initializeQuery(): Promise<void> {
    if (this.isDestroyed) return;
    
    try {
      const queryBuilder = this.getQueryBuilder();
      
      if (!queryBuilder) {
        await this.retryQuery();
        return;
      }
      
      await this.createZeroView(queryBuilder);
      
    } catch (err) {
      await this.handleError(err);
    }
  }

  private async createZeroView(queryBuilder: any): Promise<void> {
    const ttlValue = this.config.ttl;
    
    if (this.config.debugLogging) {
      console.log(`🚀 ActiveRecord: Creating view with TTL: ${ttlValue}`);
    }
    
    // Zero.js materialized view creation
    this.view = queryBuilder.materialize(ttlValue);
    
    // Set up Zero's native listener for updates
    if (this.config.enableSubscriptions) {
      this.removeListener = this.view.addListener((newData: T | T[]) => {
        if (this.isDestroyed) return;
        this.handleDataUpdate(newData);
      });
    }
    
    // Get initial data synchronously for performance
    const initialData = this.view.data;
    if (initialData !== undefined) {
      this.handleDataUpdate(initialData);
    }
  }

  private handleDataUpdate(data: T | T[]): void {
    // Direct property assignment for maximum performance
    this.data = data;
    this.isLoading = false;
    this.error = null;
    
    if (this.config.debugLogging) {
      console.log(`🚀 ActiveRecord: Data updated, count: ${this.getCount()}`);
    }
    
    this.notifySubscribers();
  }

  private async handleError(err: any): Promise<void> {
    if (this.isDestroyed) return;
    
    const context: ErrorContext = {
      operationId: this.operationId,
      operation: 'activerecord_query',
      ttl: this.config.ttl,
      queryType: this.isCollection ? 'collection' : 'single'
    };
    
    const result = await zeroErrorHandler.handleError(err, context);
    
    this.error = result.error;
    this.isLoading = false;
    
    if (result.shouldRetry) {
      setTimeout(() => this.initializeQuery(), result.retryDelay);
    } else {
      this.notifySubscribers();
    }
  }

  private async retryQuery(): Promise<void> {
    if (this.retryCount >= this.config.maxRetries) {
      await this.handleError(new Error('Max retries exceeded waiting for Zero client'));
      return;
    }
    
    this.retryCount++;
    setTimeout(() => this.initializeQuery(), this.config.retryDelay);
  }

  private notifySubscribers(): void {
    if (!this.config.enableSubscriptions || this.subscribers.length === 0) return;
    
    const meta = {
      isLoading: this.isLoading,
      error: this.error,
      count: this.getCount()
    };
    
    // Performance-optimized notification
    for (let i = 0; i < this.subscribers.length; i++) {
      try {
        this.subscribers[i](this.data, meta);
      } catch (err) {
        console.error('ActiveRecord subscriber error:', err);
      }
    }
  }

  private cleanup(): void {
    if (this.removeListener) {
      this.removeListener();
      this.removeListener = null;
    }
    
    if (this.view) {
      this.view.destroy();
      this.view = null;
    }
    
    zeroErrorHandler.resetRetries(this.operationId);
  }
}

/**
 * High-Performance ActiveRecord Factory
 * Creates optimized ActiveRecord instances with direct property access
 */
export class ActiveRecord<T> {
  constructor(
    private tableName: string,
    private config: ActiveRecordConfig = {}
  ) {}

  /**
   * Find record by ID (like Rails .find)
   * Returns instance with direct property access
   */
  find(id: string, options: ActiveRecordConfig = {}): ActiveRecordInstance<T> {
    return new ActiveRecordInstance<T>(
      () => {
        const zero = getZero();
        return zero ? zero.query[this.tableName].where('id', id).one() : null;
      },
      {
        ...this.config,
        ...options,
        expectsCollection: false
      }
    );
  }

  /**
   * Find record by conditions (like Rails .find_by)
   */
  findBy(conditions: Partial<T>, options: ActiveRecordConfig = {}): ActiveRecordInstance<T> {
    return new ActiveRecordInstance<T>(
      () => {
        const zero = getZero();
        if (!zero) return null;
        
        let query = zero.query[this.tableName];
        
        Object.entries(conditions).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.where(key, value);
          }
        });
        
        return query.one();
      },
      {
        ...this.config,
        ...options,
        expectsCollection: false
      }
    );
  }

  /**
   * Get all records (like Rails .all)
   * Optimized for large collections (1000+ records)
   */
  all(options: ActiveRecordConfig = {}): ActiveRecordInstance<T> {
    return new ActiveRecordInstance<T>(
      () => {
        const zero = getZero();
        return zero ? zero.query[this.tableName].orderBy('created_at', 'desc') : null;
      },
      {
        ...this.config,
        ...options,
        expectsCollection: true
      }
    );
  }

  /**
   * Find records matching conditions (like Rails .where)
   * Memory optimized for large collections
   */
  where(conditions: Partial<T>, options: ActiveRecordConfig = {}): ActiveRecordInstance<T> {
    return new ActiveRecordInstance<T>(
      () => {
        const zero = getZero();
        if (!zero) return null;
        
        let query = zero.query[this.tableName];
        
        Object.entries(conditions).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.where(key, value);
          }
        });
        
        return query.orderBy('created_at', 'desc');
      },
      {
        ...this.config,
        ...options,
        expectsCollection: true
      }
    );
  }

  /**
   * Create performance-optimized instance without subscriptions
   * Use for read-only operations where maximum performance is needed
   */
  static readonly<T>(tableName: string, config: ActiveRecordConfig = {}): ActiveRecord<T> {
    return new ActiveRecord<T>(tableName, {
      ...config,
      enableSubscriptions: false,
      debugLogging: false
    });
  }

  /**
   * Create batch-optimized instance for handling large datasets
   */
  static batch<T>(tableName: string, config: ActiveRecordConfig = {}): ActiveRecord<T> {
    return new ActiveRecord<T>(tableName, {
      ...config,
      ttl: '10m', // Longer TTL for batch operations
      maxRetries: 20, // Fewer retries for batch
      enableSubscriptions: false // No subscriptions for batch
    });
  }
}

/**
 * Convenience factory function (Epic-007 Story 5 requirement)
 * Usage: const ActiveJob = createActiveModel<Job>('jobs');
 */
export function createActiveModel<T>(tableName: string, config: ActiveRecordConfig = {}): ActiveRecord<T> {
  return new ActiveRecord<T>(tableName, config);
}

/**
 * Performance utilities for large collections
 */
export const ActiveRecordPerformance = {
  /**
   * Create memory-optimized instance for 1000+ records
   */
  createLargeCollection<T>(tableName: string): ActiveRecord<T> {
    return new ActiveRecord<T>(tableName, {
      ttl: '5m', // Shorter TTL to prevent memory buildup
      enableSubscriptions: false, // Disable subscriptions for performance
      debugLogging: false, // No debug logging for performance
      maxRetries: 10 // Fewer retries for large datasets
    });
  },

  /**
   * Create high-frequency polling instance
   */
  createRealTime<T>(tableName: string): ActiveRecord<T> {
    return new ActiveRecord<T>(tableName, {
      ttl: '30s', // Very short TTL for real-time updates
      enableSubscriptions: true, // Enable subscriptions for real-time
      retryDelay: 50, // Fast retries for real-time
      maxRetries: 100 // More retries for real-time reliability
    });
  },

  /**
   * Memory usage analyzer for performance monitoring
   */
  analyzeMemoryUsage(instances: ActiveRecordInstance<any>[]): {
    totalInstances: number;
    avgSubscribers: number;
    totalMemoryEstimate: string;
  } {
    const totalInstances = instances.length;
    const totalSubscribers = instances.reduce((sum, instance) => {
      return sum + (instance as any).subscribers?.length || 0;
    }, 0);
    
    // Rough memory estimate: 200 bytes per instance + 50 bytes per subscriber
    const estimatedBytes = (totalInstances * 200) + (totalSubscribers * 50);
    const totalMemoryEstimate = estimatedBytes < 1024 
      ? `${estimatedBytes} bytes`
      : estimatedBytes < 1024 * 1024
      ? `${(estimatedBytes / 1024).toFixed(1)} KB`
      : `${(estimatedBytes / (1024 * 1024)).toFixed(1)} MB`;
    
    return {
      totalInstances,
      avgSubscribers: totalSubscribers / totalInstances || 0,
      totalMemoryEstimate
    };
  }
};

// Export all types for external use
export type { ActiveRecordConfig, SubscriptionCallback };