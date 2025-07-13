/*
 * ⚠️  WARNING: AUTO-GENERATED FILE - DO NOT EDIT! ⚠️
 * 
 * This file was automatically generated from Rails schema introspection.
 * Any manual changes will be lost when the generator runs again.
 * 
 * Generated: 2025-07-13 00:54:52 UTC
 * Table: task_completions
 * Generator: rails generate zero:factory_models
 * 
 * To regenerate: bin/rails generate zero:factory_models
 * To customize: Modify the Rails model or generator templates
 */

import { ModelFactory, type ModelConfig } from '../../record-factory/model-factory';
import { ModelConfigBuilder } from '../../record-factory/model-config';


/**
 * TypeScript interface for TaskCompletion model
 * Auto-generated from Rails schema
 */
export interface TaskCompletion {
  status: string;
  completed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  id: string;
  task_id?: string;
  job_target_id?: string;
  completed_by_id?: string;
}


/**
 * Model configuration for TaskCompletion
 * Built using ModelConfigBuilder for type safety
 */
const task_completionConfig: ModelConfig = new ModelConfigBuilder('task_completion', 'task_completions')
  .setZeroConfig({
    tableName: 'task_completions',
    primaryKey: 'id'
  })
  .build();

// Add attributes to configuration
task_completionConfig.attributes = [
    { name: 'status', type: 'string', nullable: false },
    { name: 'completed_at', type: 'datetime', nullable: true },
    { name: 'notes', type: 'text', nullable: true },
    { name: 'created_at', type: 'datetime', nullable: false },
    { name: 'updated_at', type: 'datetime', nullable: false },
    { name: 'id', type: 'uuid', nullable: false },
    { name: 'task_id', type: 'uuid', nullable: true },
    { name: 'job_target_id', type: 'uuid', nullable: true },
    { name: 'completed_by_id', type: 'uuid', nullable: true }
];

// Add associations to configuration
task_completionConfig.associations = [

];

// Add scopes to configuration
task_completionConfig.scopes = [

];


/**
 * Factory instances for TaskCompletion
 * 
 * Generated .ts files provide only ActiveRecord (non-reactive) models.
 * For reactive models in Svelte components, import the reactive factory:
 * 
 * ```typescript
 * // In Svelte components (.svelte files):
 * import { ModelFactory } from '$lib/record-factory/model-factory.svelte';
 * import { task_completionConfig } from '$lib/models/generated/task_completion';
 * const TaskCompletionReactive = ModelFactory.createReactiveModel<TaskCompletion>(task_completionConfig);
 * ```
 */
export const TaskCompletionActive = ModelFactory.createActiveModel<TaskCompletion>(task_completionConfig);

// Default export for convenience (ActiveRecord)
export default TaskCompletionActive;

// Export configuration for use in Svelte components
export { task_completionConfig };

// Re-export the interface
export type { TaskCompletion };
