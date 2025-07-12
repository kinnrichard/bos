// Record Factory System - Main exports
// Factory-based architecture for ReactiveRecord and ActiveRecord models
// Eliminates code duplication and provides Rails-compatible APIs

export { 
  BaseRecord, 
  ActiveRecordError, 
  TTLValidator, 
  ConnectionRecovery,
  DEFAULT_TTL 
} from './base-record';

export { 
  ModelFactory, 
  FactoryUtils 
} from './model-factory';

export { 
  ModelConfigBuilder, 
  ModelConfigValidator 
} from './model-config';

export {
  ReactiveRecord,
  ReactiveModelFactory,
  createReactiveModelWithScopes,
  createReactiveModel,
  ReactiveRecordUtils
} from './reactive-record';

export {
  ActiveRecord,
  ActiveRecordInstance,
  createActiveModel,
  ActiveRecordPerformance
} from './active-record';

export {
  TTLHandler,
  ZeroErrorRecovery,
  ZeroPerformanceMonitor,
  OptimizedZeroQuery,
  cleanupZeroIntegration
} from './zero-integration';

export type { 
  BaseRecordConfig, 
  QueryMeta 
} from './base-record';

export type { 
  ModelConfig,
  FactoryCreateOptions,
  AssociationType,
  ValidationType,
  ScopeConfig,
  AssociationConfig,
  ValidationConfig,
  AttributeConfig,
  ZeroQueryConfig,
  MethodSignature
} from './model-config';

export type {
  ReactiveRecordConfig
} from './reactive-record';

export type {
  ActiveRecordConfig,
  SubscriptionCallback
} from './active-record';

/**
 * Quick factory creation utilities
 */

/**
 * Create a ReactiveRecord model for Svelte components (Legacy - use new createReactiveModel)
 * @deprecated Use the new createReactiveModel from './reactive-record' instead
 */
export function createReactiveModelLegacy<T>(name: string, tableName: string) {
  const config = FactoryUtils.createSimpleConfig(name, tableName);
  return ModelFactory.createReactiveModel<T>(config);
}

// createActiveModel is exported from ./active-record module

/**
 * Create both ReactiveRecord and ActiveRecord models
 * @param name - Model name (e.g., 'task')
 * @param tableName - Zero.js table name (e.g., 'tasks')
 * @returns Object with both reactive and active model factories
 * 
 * @example
 * ```typescript
 * import { createDualModel } from '$lib/record-factory';
 * 
 * // Create both models at once
 * const { ReactiveTask, ActiveTask } = createDualModel<Task>('task', 'tasks');
 * 
 * // Use ReactiveTask in Svelte components
 * // Use ActiveTask in vanilla JS/testing
 * ```
 */
export function createDualModel<T>(name: string, tableName: string) {
  const config = FactoryUtils.createSimpleConfig(name, tableName);
  return {
    [`Reactive${config.className}`]: ModelFactory.createReactiveModel<T>(config),
    [`Active${config.className}`]: ModelFactory.createActiveModel<T>(config)
  };
}

/**
 * Advanced factory creation with full configuration
 * @param config - Complete ModelConfig with Rails features
 * @returns Object with both reactive and active model factories
 * 
 * @example
 * ```typescript
 * import { createModelsFromConfig, ModelConfigBuilder } from '$lib/record-factory';
 * 
 * const config = new ModelConfigBuilder('task', 'tasks')
 *   .addAttribute({ name: 'title', type: 'string' })
 *   .addAssociation({ name: 'job', type: 'belongs_to', className: 'Job' })
 *   .addScope({ name: 'active', conditions: { status: 'active' } })
 *   .build();
 * 
 * const { ReactiveTask, ActiveTask } = createModelsFromConfig<Task>(config);
 * ```
 */
export function createModelsFromConfig<T>(config: ModelConfig) {
  const validation = ModelConfigValidator.validateFactoryConfig(config);
  if (!validation.valid) {
    throw new ActiveRecordError(`Invalid model configuration: ${validation.errors.join(', ')}`);
  }
  
  return {
    [`Reactive${config.className}`]: ModelFactory.createReactiveModel<T>(config),
    [`Active${config.className}`]: ModelFactory.createActiveModel<T>(config)
  };
}