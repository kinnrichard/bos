/**
 * Model-Specific Mutator Configurations
 * 
 * This file combines all mutators for each model type, providing complete
 * mutation pipelines that include normalization, validation, positioning,
 * user attribution, and activity logging.
 */

import type { MutatorFunction, MutatorContext } from './base-mutator';
import { taskPositioningMutator } from './positioning';
import { 
  taskActivityLoggingMutator,
  jobActivityLoggingMutator, 
  clientActivityLoggingMutator,
  userActivityLoggingMutator 
} from './activity-logging';

/**
 * Mutator pipeline executor
 * Runs multiple mutators in sequence, passing the result of each to the next
 */
async function executeMutatorPipeline<T>(
  data: T,
  context: MutatorContext,
  mutators: MutatorFunction<T>[]
): Promise<T> {
  let result = data;
  
  for (const mutator of mutators) {
    result = await mutator(result, context);
  }
  
  return result;
}

/**
 * Task mutator pipeline
 * 1. Positioning (automatic position assignment)
 * 2. Activity logging (audit trail)
 */
export const taskMutatorPipeline: MutatorFunction<any> = async (data, context) => {
  return executeMutatorPipeline(data, context, [
    taskPositioningMutator,
    taskActivityLoggingMutator
  ]);
};

/**
 * Job mutator pipeline  
 * 1. Activity logging (audit trail)
 */
export const jobMutatorPipeline: MutatorFunction<any> = async (data, context) => {
  return executeMutatorPipeline(data, context, [
    jobActivityLoggingMutator
  ]);
};

/**
 * Client mutator pipeline
 * 1. Activity logging (audit trail)
 */
export const clientMutatorPipeline: MutatorFunction<any> = async (data, context) => {
  return executeMutatorPipeline(data, context, [
    clientActivityLoggingMutator
  ]);
};

/**
 * User mutator pipeline
 * 1. Activity logging (audit trail - limited for privacy)
 */
export const userMutatorPipeline: MutatorFunction<any> = async (data, context) => {
  return executeMutatorPipeline(data, context, [
    userActivityLoggingMutator
  ]);
};

/**
 * Generic mutator pipeline for models that only need basic tracking
 * Currently empty but can be extended
 */
export const genericMutatorPipeline: MutatorFunction<any> = async (data, context) => {
  // No mutators currently - just pass through
  return data;
};

/**
 * Model mutator registry
 * Maps table names to their respective mutator pipelines
 */
export const MODEL_MUTATORS: Record<string, MutatorFunction<any>> = {
  tasks: taskMutatorPipeline,
  jobs: jobMutatorPipeline,
  clients: clientMutatorPipeline,
  users: userMutatorPipeline,
  
  // Additional models with basic attribution
  devices: genericMutatorPipeline,
  people: genericMutatorPipeline,
  scheduled_date_times: genericMutatorPipeline,
  notes: genericMutatorPipeline,
  
  // Activity logs themselves don't need mutation (would create infinite loop)
  activity_logs: async (data, context) => data
};

/**
 * Get mutator pipeline for a specific model
 */
export function getMutatorForModel(tableName: string): MutatorFunction<any> | null {
  return MODEL_MUTATORS[tableName] || null;
}

/**
 * Register a custom mutator pipeline for a model
 */
export function registerModelMutator(tableName: string, mutator: MutatorFunction<any>): void {
  MODEL_MUTATORS[tableName] = mutator;
}

/**
 * Mutator configuration for enhanced context building
 */
export interface MutatorConfig {
  /** Enable change tracking for activity logging */
  trackChanges?: boolean;
  /** Custom metadata to include in logs */
  metadata?: Record<string, any>;
  /** Skip specific mutators by name */
  skipMutators?: string[];
}

/**
 * Enhanced mutator execution with change tracking and configuration
 */
export async function executeMutatorWithTracking<T>(
  tableName: string,
  data: T,
  originalData: T | null,
  context: MutatorContext,
  config: MutatorConfig = {}
): Promise<T> {
  console.log('[Model Mutators] executeMutatorWithTracking called for', tableName);
  
  const mutator = getMutatorForModel(tableName);
  if (!mutator) {
    console.log('[Model Mutators] No mutator found for', tableName);
    return data;
  }

  console.log('[Model Mutators] Found mutator for', tableName);

  // Build enhanced context with change tracking
  const enhancedContext: MutatorContext = {
    ...context,
    changes: config.trackChanges ? buildChangeTracking(originalData, data) : undefined,
    metadata: { ...context.metadata, ...config.metadata }
  };

  console.log('[Model Mutators] Calling mutator with enhanced context');
  return mutator(data, enhancedContext);
}

/**
 * Build change tracking object for activity logging
 */
function buildChangeTracking<T>(original: T | null, updated: T): Record<string, [any, any]> | undefined {
  if (!original || typeof original !== 'object' || typeof updated !== 'object') {
    return undefined;
  }

  const changes: Record<string, [any, any]> = {};
  
  // Compare all fields in the updated object
  for (const [key, newValue] of Object.entries(updated as Record<string, any>)) {
    const oldValue = (original as Record<string, any>)[key];
    
    // Skip if values are the same
    if (oldValue === newValue) {
      continue;
    }
    
    // Handle null/undefined comparisons
    if (oldValue == null && newValue == null) {
      continue;
    }
    
    changes[key] = [oldValue, newValue];
  }
  
  return Object.keys(changes).length > 0 ? changes : undefined;
}

/**
 * Export individual mutators for direct use
 */
export {
  taskPositioningMutator,
  taskActivityLoggingMutator,
  jobActivityLoggingMutator,
  clientActivityLoggingMutator,
  userActivityLoggingMutator
};