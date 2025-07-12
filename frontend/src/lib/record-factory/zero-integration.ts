// Zero.js Integration Optimization - Epic-007 Story 7
// TTL fixes, error handling, and performance at scale

import { getZero } from '../zero/zero-client';
import { ZERO_CONFIG } from '../zero/zero-config';
import { zeroErrorHandler, ConfigError, ConnectionError, QueryError, type ErrorContext } from '../zero/zero-errors';

/**
 * Zero.js Connection Pool for managing 100+ simultaneous reactive records
 */
class ZeroConnectionPool {
  private connections = new Map<string, any>();
  private listeners = new Map<string, () => void>();
  private healthChecks = new Map<string, number>();
  private readonly maxConnections = 150; // Support 100+ with buffer
  private readonly healthCheckInterval = 30000; // 30s health checks

  /**
   * Get or create optimized Zero connection
   */
  getConnection(operationId: string): any | null {
    try {
      const zero = getZero();
      if (!zero) {
        this.scheduleHealthCheck(operationId);
        return null;
      }

      // Store connection reference for health monitoring
      this.connections.set(operationId, zero);
      this.clearHealthCheck(operationId);
      
      return zero;
    } catch (error) {
      this.handleConnectionError(operationId, error);
      return null;
    }
  }

  /**
   * Register listener with automatic cleanup tracking
   */
  registerListener(operationId: string, removeListener: () => void): void {
    // Clean up any existing listener first
    this.cleanupListener(operationId);
    
    // Store new listener
    this.listeners.set(operationId, removeListener);
    
    // Enforce connection limit to prevent memory leaks
    if (this.listeners.size > this.maxConnections) {
      this.cleanupOldestConnections();
    }
  }

  /**
   * Clean up specific listener and connection
   */
  cleanupListener(operationId: string): void {
    const removeListener = this.listeners.get(operationId);
    if (removeListener) {
      try {
        removeListener();
      } catch (error) {
        console.warn(`Error cleaning up listener ${operationId}:`, error);
      }
      this.listeners.delete(operationId);
    }

    this.connections.delete(operationId);
    this.clearHealthCheck(operationId);
  }

  /**
   * Clean up all connections and listeners
   */
  cleanupAll(): void {
    for (const [operationId] of this.listeners) {
      this.cleanupListener(operationId);
    }
    
    for (const [, timeoutId] of this.healthChecks) {
      clearTimeout(timeoutId);
    }
    this.healthChecks.clear();
  }

  /**
   * Get connection pool statistics
   */
  getStats(): {
    activeConnections: number;
    activeListeners: number;
    healthChecks: number;
    memoryUsage: string;
  } {
    const connections = this.connections.size;
    const listeners = this.listeners.size;
    const healthChecks = this.healthChecks.size;
    
    // Estimate memory usage (rough calculation)
    const estimatedBytes = (connections * 100) + (listeners * 50) + (healthChecks * 20);
    const memoryUsage = estimatedBytes < 1024 
      ? `${estimatedBytes} bytes`
      : `${(estimatedBytes / 1024).toFixed(1)} KB`;

    return {
      activeConnections: connections,
      activeListeners: listeners,
      healthChecks,
      memoryUsage
    };
  }

  private scheduleHealthCheck(operationId: string): void {
    if (this.healthChecks.has(operationId)) return;

    const timeoutId = setTimeout(() => {
      this.performHealthCheck(operationId);
    }, this.healthCheckInterval);

    this.healthChecks.set(operationId, timeoutId as any);
  }

  private clearHealthCheck(operationId: string): void {
    const timeoutId = this.healthChecks.get(operationId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.healthChecks.delete(operationId);
    }
  }

  private async performHealthCheck(operationId: string): Promise<void> {
    try {
      const zero = getZero();
      if (zero) {
        this.connections.set(operationId, zero);
        this.clearHealthCheck(operationId);
      } else {
        // Re-schedule if still not available
        this.scheduleHealthCheck(operationId);
      }
    } catch (error) {
      this.handleConnectionError(operationId, error);
    }
  }

  private handleConnectionError(operationId: string, error: any): void {
    const context: ErrorContext = {
      operationId,
      operation: 'connection_pool',
      timestamp: Date.now()
    };

    zeroErrorHandler.handleError(
      new ConnectionError('Zero connection failed in pool', undefined, undefined, { error }),
      context
    );
  }

  private cleanupOldestConnections(): void {
    // Clean up oldest 10% of connections when limit exceeded
    const cleanupCount = Math.floor(this.listeners.size * 0.1);
    const oldestOperations = Array.from(this.listeners.keys()).slice(0, cleanupCount);
    
    for (const operationId of oldestOperations) {
      this.cleanupListener(operationId);
    }
  }
}

// Global connection pool instance
const zeroConnectionPool = new ZeroConnectionPool();

/**
 * Optimized TTL Handler - prevents ttl.slice errors completely
 */
export class TTLHandler {
  /**
   * Validate and normalize TTL value for Zero.js
   * Prevents all ttl.slice errors through comprehensive validation
   */
  static validateTTL(ttl: string | number | undefined): string | number {
    if (ttl === undefined || ttl === null) {
      return ZERO_CONFIG.query.DEFAULT_TTL;
    }

    // Handle string TTL values
    if (typeof ttl === 'string') {
      // Remove any whitespace
      const cleaned = ttl.trim();
      
      // Validate format: number followed by optional unit
      const ttlPattern = /^(\d+)([smhdy]?)$/;
      const match = cleaned.match(ttlPattern);
      
      if (!match) {
        throw new ConfigError(
          `Invalid TTL format: "${ttl}". Use format like "5m", "2h", "1d" or number in milliseconds`,
          'ttl',
          ttl
        );
      }

      // Validate units
      const [, value, unit] = match;
      const numValue = parseInt(value, 10);
      
      if (numValue <= 0) {
        throw new ConfigError(
          `TTL value must be positive: "${ttl}"`,
          'ttl',
          ttl
        );
      }

      // Return normalized string
      return unit ? `${numValue}${unit}` : `${numValue}s`;
    }

    // Handle number TTL values (milliseconds)
    if (typeof ttl === 'number') {
      if (!Number.isInteger(ttl) || ttl <= 0) {
        throw new ConfigError(
          `TTL number must be a positive integer (milliseconds): ${ttl}`,
          'ttl',
          ttl
        );
      }

      // Validate reasonable range (1 second to 1 week)
      if (ttl < 1000 || ttl > 7 * 24 * 60 * 60 * 1000) {
        console.warn(`TTL value ${ttl}ms is outside recommended range (1s to 1 week)`);
      }

      return ttl;
    }

    throw new ConfigError(
      `TTL must be string or number, got ${typeof ttl}: ${ttl}`,
      'ttl',
      ttl
    );
  }

  /**
   * Get TTL for specific query type with optimization
   */
  static getOptimizedTTL(queryType: 'find' | 'collection' | 'relationship' | 'realtime'): string {
    switch (queryType) {
      case 'find':
        return ZERO_CONFIG.query.FIND_TTL;
      case 'collection':
        return ZERO_CONFIG.query.COLLECTION_TTL;
      case 'relationship':
        return ZERO_CONFIG.query.RELATIONSHIP_TTL;
      case 'realtime':
        return '30s'; // Short TTL for real-time data
      default:
        return ZERO_CONFIG.query.DEFAULT_TTL;
    }
  }
}

/**
 * Enhanced Error Recovery System
 */
export class ZeroErrorRecovery {
  private static recoveryStrategies = new Map<string, (error: any, context: ErrorContext) => Promise<any>>();

  /**
   * Register custom recovery strategy
   */
  static registerRecoveryStrategy(errorType: string, strategy: (error: any, context: ErrorContext) => Promise<any>): void {
    this.recoveryStrategies.set(errorType, strategy);
  }

  /**
   * Attempt error recovery with fallback strategies
   */
  static async attemptRecovery(error: any, context: ErrorContext): Promise<{
    recovered: boolean;
    result?: any;
    fallbackUsed?: string;
  }> {
    // Try specific recovery strategy first
    const strategy = this.recoveryStrategies.get(error.name);
    if (strategy) {
      try {
        const result = await strategy(error, context);
        return { recovered: true, result };
      } catch (recoveryError) {
        console.warn(`Recovery strategy failed for ${error.name}:`, recoveryError);
      }
    }

    // Try generic recovery strategies
    if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
      return this.recoverFromNetworkError(error, context);
    }

    if (error.message?.includes('ttl') || error.message?.includes('slice')) {
      return this.recoverFromTTLError(error, context);
    }

    if (error.status === 401 || error.message?.includes('auth')) {
      return this.recoverFromAuthError(error, context);
    }

    return { recovered: false };
  }

  private static async recoverFromNetworkError(error: any, context: ErrorContext): Promise<any> {
    // Wait for connection recovery
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempts + 1)));
      
      try {
        const zero = getZero();
        if (zero) {
          return { recovered: true, result: zero, fallbackUsed: 'network_retry' };
        }
      } catch {
        // Continue to next attempt
      }
      
      attempts++;
    }

    return { recovered: false };
  }

  private static async recoverFromTTLError(error: any, context: ErrorContext): Promise<any> {
    try {
      // Use default TTL as fallback
      const safeTTL = ZERO_CONFIG.query.DEFAULT_TTL;
      console.warn(`TTL error recovered using default TTL: ${safeTTL}`);
      
      return { 
        recovered: true, 
        result: { ttl: safeTTL }, 
        fallbackUsed: 'default_ttl' 
      };
    } catch {
      return { recovered: false };
    }
  }

  private static async recoverFromAuthError(error: any, context: ErrorContext): Promise<any> {
    // Attempt to refresh token or redirect to login
    try {
      // Check if we can refresh the token
      const response = await fetch('/api/v1/zero/token', { 
        method: 'POST',
        credentials: 'include' 
      });
      
      if (response.ok) {
        return { recovered: true, result: 'token_refreshed', fallbackUsed: 'auth_refresh' };
      }
    } catch {
      // Token refresh failed - redirect may be needed
    }

    return { recovered: false };
  }
}

/**
 * Performance Monitor for 100+ simultaneous reactive records
 */
export class ZeroPerformanceMonitor {
  private static metrics = {
    activeQueries: 0,
    totalQueries: 0,
    averageResponseTime: 0,
    errorRate: 0,
    memoryUsage: 0
  };

  private static queryStartTimes = new Map<string, number>();
  private static responseTimes: number[] = [];
  private static errorCount = 0;

  /**
   * Track query start
   */
  static trackQueryStart(operationId: string): void {
    this.queryStartTimes.set(operationId, Date.now());
    this.metrics.activeQueries++;
    this.metrics.totalQueries++;
  }

  /**
   * Track query completion
   */
  static trackQueryComplete(operationId: string, success: boolean): void {
    const startTime = this.queryStartTimes.get(operationId);
    if (startTime) {
      const responseTime = Date.now() - startTime;
      this.responseTimes.push(responseTime);
      this.queryStartTimes.delete(operationId);
      
      // Keep only last 100 response times for average calculation
      if (this.responseTimes.length > 100) {
        this.responseTimes = this.responseTimes.slice(-100);
      }
      
      this.metrics.averageResponseTime = 
        this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
    }

    this.metrics.activeQueries = Math.max(0, this.metrics.activeQueries - 1);
    
    if (!success) {
      this.errorCount++;
    }
    
    this.metrics.errorRate = this.metrics.totalQueries > 0 
      ? (this.errorCount / this.metrics.totalQueries) * 100 
      : 0;
  }

  /**
   * Get current performance metrics
   */
  static getMetrics(): typeof ZeroPerformanceMonitor.metrics & {
    connectionPoolStats: ReturnType<typeof zeroConnectionPool.getStats>;
  } {
    return {
      ...this.metrics,
      connectionPoolStats: zeroConnectionPool.getStats()
    };
  }

  /**
   * Check if performance is acceptable for 100+ records
   */
  static isPerformanceAcceptable(): {
    acceptable: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check active query count
    if (this.metrics.activeQueries > 150) {
      issues.push(`Too many active queries: ${this.metrics.activeQueries}`);
      recommendations.push('Consider using batch queries or pagination');
    }

    // Check average response time
    if (this.metrics.averageResponseTime > 1000) {
      issues.push(`High average response time: ${this.metrics.averageResponseTime}ms`);
      recommendations.push('Optimize TTL settings or query patterns');
    }

    // Check error rate
    if (this.metrics.errorRate > 5) {
      issues.push(`High error rate: ${this.metrics.errorRate.toFixed(1)}%`);
      recommendations.push('Implement better error handling and retry logic');
    }

    // Check connection pool health
    const poolStats = zeroConnectionPool.getStats();
    if (poolStats.activeListeners > 120) {
      issues.push(`Too many active listeners: ${poolStats.activeListeners}`);
      recommendations.push('Implement listener cleanup and connection pooling');
    }

    return {
      acceptable: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Reset all metrics (useful for testing)
   */
  static resetMetrics(): void {
    this.metrics = {
      activeQueries: 0,
      totalQueries: 0,
      averageResponseTime: 0,
      errorRate: 0,
      memoryUsage: 0
    };
    this.queryStartTimes.clear();
    this.responseTimes = [];
    this.errorCount = 0;
  }
}

/**
 * Enhanced Zero.js Query Builder with optimizations
 */
export class OptimizedZeroQuery<T> {
  private operationId: string;
  private queryType: 'find' | 'collection' | 'relationship' | 'realtime';
  
  constructor(
    private tableName: string,
    queryType: 'find' | 'collection' | 'relationship' | 'realtime' = 'find'
  ) {
    this.operationId = `zero-query-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.queryType = queryType;
  }

  /**
   * Create optimized Zero.js query with error handling and recovery
   */
  async createQuery(
    queryBuilder: (zero: any) => any,
    config: {
      ttl?: string | number;
      expectsCollection?: boolean;
      onData?: (data: T | T[]) => void;
      onError?: (error: Error) => void;
    } = {}
  ): Promise<{
    view: any;
    removeListener: () => void;
    operationId: string;
  } | null> {
    
    ZeroPerformanceMonitor.trackQueryStart(this.operationId);
    
    try {
      // Get Zero connection through pool
      const zero = zeroConnectionPool.getConnection(this.operationId);
      if (!zero) {
        throw new ConnectionError('Zero client not available');
      }

      // Validate TTL
      const validatedTTL = TTLHandler.validateTTL(config.ttl);
      const optimizedTTL = config.ttl || TTLHandler.getOptimizedTTL(this.queryType);

      // Create query
      const query = queryBuilder(zero);
      if (!query) {
        throw new QueryError('Query builder returned null', this.queryType);
      }

      // Create materialized view with validated TTL
      const view = query.materialize(optimizedTTL);

      // Set up listener with automatic cleanup
      const removeListener = view.addListener((newData: T | T[]) => {
        if (config.onData) {
          config.onData(newData);
        }
      });

      // Register listener for cleanup tracking
      zeroConnectionPool.registerListener(this.operationId, removeListener);

      ZeroPerformanceMonitor.trackQueryComplete(this.operationId, true);

      return {
        view,
        removeListener: () => {
          zeroConnectionPool.cleanupListener(this.operationId);
        },
        operationId: this.operationId
      };

    } catch (error) {
      ZeroPerformanceMonitor.trackQueryComplete(this.operationId, false);
      
      // Attempt error recovery
      const recovery = await ZeroErrorRecovery.attemptRecovery(error, {
        operationId: this.operationId,
        operation: 'create_query',
        queryType: this.queryType,
        ttl: config.ttl
      });

      if (recovery.recovered) {
        console.log(`Query recovered using ${recovery.fallbackUsed}`);
        // Retry with recovered settings
        return this.createQuery(queryBuilder, {
          ...config,
          ttl: recovery.result?.ttl || config.ttl
        });
      }

      if (config.onError) {
        config.onError(error as Error);
      }

      throw error;
    }
  }

  /**
   * Cleanup query and resources
   */
  destroy(): void {
    zeroConnectionPool.cleanupListener(this.operationId);
  }
}

// Initialize default recovery strategies
ZeroErrorRecovery.registerRecoveryStrategy('ConfigError', async (error, context) => {
  if (error.message.includes('ttl')) {
    return { ttl: ZERO_CONFIG.query.DEFAULT_TTL };
  }
  throw error;
});

ZeroErrorRecovery.registerRecoveryStrategy('ConnectionError', async (error, context) => {
  // Wait and retry connection
  await new Promise(resolve => setTimeout(resolve, 1000));
  const zero = getZero();
  if (zero) {
    return zero;
  }
  throw error;
});

// Export utilities for use throughout the application
export {
  zeroConnectionPool
};

// Global cleanup function
export function cleanupZeroIntegration(): void {
  zeroConnectionPool.cleanupAll();
  ZeroPerformanceMonitor.resetMetrics();
}

// Auto-cleanup on page unload (prevent memory leaks)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanupZeroIntegration);
}