// Record Factory System - Epic-008 Migration
// Simplified exports for remaining components after factory pattern removal

// Export remaining base components
export { 
  BaseRecord, 
  TTLValidator, 
  ConnectionRecovery,
  DEFAULT_TTL 
} from './base-record';

export { 
  ModelConfigBuilder, 
  ModelConfigValidator 
} from './model-config';

export {
  ActiveRecord
} from './active-record';

export {
  TTLHandler,
  ZeroErrorRecovery,
  ZeroPerformanceMonitor,
  OptimizedZeroQuery,
  cleanupZeroIntegration
} from './zero-integration';

// Re-export important model configuration types
export type {
  ModelConfig,
  ZeroQueryConfig
} from './model-config';

// ActiveRecord error class for compatibility
export class ActiveRecordError extends Error {
  constructor(message: string, public model?: string) {
    super(message);
    this.name = 'ActiveRecordError';
  }
}

// Epic-008: Simplified architecture note
// The complex factory patterns have been removed in favor of direct Zero.js integration
// Use models from ../zero/*.generated.ts for new code