/*
 * ⚠️  WARNING: AUTO-GENERATED FILE - DO NOT EDIT! ⚠️
 * 
 * This file was automatically generated from Rails schema introspection.
 * Any manual changes will be lost when the generator runs again.
 * 
 * Generated: 2025-07-13 04:12:41 UTC
 * Table: job_targets
 * Generator: rails generate zero:factory_models
 * 
 * To regenerate: bin/rails generate zero:factory_models
 * To customize: Modify the Rails model or generator templates
 */

import { ModelFactory, type ModelConfig } from '../../record-factory/model-factory';
import { ModelConfigBuilder } from '../../record-factory/model-config';


/**
 * TypeScript interface for JobTarget model
 * Auto-generated from Rails schema
 */
export interface JobTarget {
  target_type: string;
  status?: string;
  instance_number: number;
  reason?: string;
  created_at: string;
  updated_at: string;
  id: string;
  job_id?: string;
  target_id?: string;
}


/**
 * Model configuration for JobTarget
 * Built using ModelConfigBuilder for type safety
 */
const job_targetConfig: ModelConfig = new ModelConfigBuilder('job_target', 'job_targets')
  .setZeroConfig({
    tableName: 'job_targets',
    primaryKey: 'id'
  })
  .build();

// Add attributes to configuration
job_targetConfig.attributes = [
    { name: 'target_type', type: 'string', nullable: false },
    { name: 'status', type: 'string', nullable: true },
    { name: 'instance_number', type: 'integer', nullable: false },
    { name: 'reason', type: 'string', nullable: true },
    { name: 'created_at', type: 'datetime', nullable: false },
    { name: 'updated_at', type: 'datetime', nullable: false },
    { name: 'id', type: 'uuid', nullable: false },
    { name: 'job_id', type: 'uuid', nullable: true },
    { name: 'target_id', type: 'uuid', nullable: true }
];

// Add associations to configuration
job_targetConfig.associations = [

];

// Add scopes to configuration
job_targetConfig.scopes = [

];


/**
 * Factory instances for JobTarget
 * 
 * Generated .ts files provide only ActiveRecord (non-reactive) models.
 * For reactive models in Svelte components, import the reactive factory:
 * 
 * ```typescript
 * // In Svelte components (.svelte files):
 * import { ModelFactory } from '$lib/record-factory/model-factory.svelte';
 * import { job_targetConfig } from '$lib/models/generated/job_target';
 * const JobTargetReactive = ModelFactory.createReactiveModel<JobTarget>(job_targetConfig);
 * ```
 */
export const JobTargetActive = ModelFactory.createActiveModel<JobTarget>(job_targetConfig);

// Default export for convenience (ActiveRecord)
export default JobTargetActive;

// Export configuration for use in Svelte components
export { job_targetConfig };

// Re-export the interface
export type { JobTarget };
