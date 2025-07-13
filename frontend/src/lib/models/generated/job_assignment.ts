/*
 * ⚠️  WARNING: AUTO-GENERATED FILE - DO NOT EDIT! ⚠️
 * 
 * This file was automatically generated from Rails schema introspection.
 * Any manual changes will be lost when the generator runs again.
 * 
 * Generated: 2025-07-13 12:13:36 UTC
 * Table: job_assignments
 * Generator: rails generate zero:factory_models
 * 
 * To regenerate: bin/rails generate zero:factory_models
 * To customize: Modify the Rails model or generator templates
 */

import { ModelFactory, type ModelConfig } from '../../record-factory/model-factory';
import { ModelConfigBuilder } from '../../record-factory/model-config';


/**
 * TypeScript interface for JobAssignmentType 
 * Describes the data structure/shape for database records
 * Auto-generated from Rails schema
 */
export interface JobAssignmentType {
  created_at: string;
  updated_at: string;
  id: string;
  job_id?: string;
  user_id?: string;
}


/**
 * Model configuration for JobAssignment
 * Built using ModelConfigBuilder for type safety
 */
const job_assignmentConfig: ModelConfig = new ModelConfigBuilder('job_assignment', 'job_assignments')
  .setZeroConfig({
    tableName: 'job_assignments',
    primaryKey: 'id'
  })
  .build();

// Add attributes to configuration
job_assignmentConfig.attributes = [
    { name: 'created_at', type: 'datetime', nullable: false },
    { name: 'updated_at', type: 'datetime', nullable: false },
    { name: 'id', type: 'uuid', nullable: false },
    { name: 'job_id', type: 'uuid', nullable: true },
    { name: 'user_id', type: 'uuid', nullable: true }
];

// Add associations to configuration
job_assignmentConfig.associations = [
    { name: 'job', type: 'belongs_to', className: 'Job', foreignKey: 'job_id' },
    { name: 'user', type: 'belongs_to', className: 'User', foreignKey: 'user_id' }
];

// Add scopes to configuration
job_assignmentConfig.scopes = [

];


/**
 * Factory instances for JobAssignment (Rails-idiomatic naming)
 * 
 * JobAssignment = ActiveRecord-style class (primary interface)
 * JobAssignmentType = TypeScript interface (data structure)
 * 
 * Generated .ts files provide only ActiveRecord (non-reactive) models.
 * For reactive models in Svelte components, import the reactive factory:
 * 
 * ```typescript
 * // In Svelte components (.svelte files):
 * import { ModelFactory } from '$lib/record-factory/model-factory.svelte';
 * import { job_assignmentConfig } from '$lib/models/generated/job_assignment';
 * const JobAssignmentReactive = ModelFactory.createReactiveModel<JobAssignmentType>(job_assignmentConfig);
 * ```
 */
export const JobAssignment = ModelFactory.createActiveModel<JobAssignmentType>(job_assignmentConfig);

// Default export for convenience (ActiveRecord class)
export default JobAssignment;

// Export configuration for use in Svelte components
export { job_assignmentConfig };

// Re-export the interface type
export type { JobAssignmentType };
