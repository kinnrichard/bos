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
      debugLogging: config.debugLogging ?? true
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