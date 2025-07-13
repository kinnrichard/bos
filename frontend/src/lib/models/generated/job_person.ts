/*
 * ⚠️  WARNING: AUTO-GENERATED FILE - DO NOT EDIT! ⚠️
 * 
 * This file was automatically generated from Rails schema introspection.
 * Any manual changes will be lost when the generator runs again.
 * 
 * Generated: 2025-07-13 00:54:52 UTC
 * Table: job_people
 * Generator: rails generate zero:factory_models
 * 
 * To regenerate: bin/rails generate zero:factory_models
 * To customize: Modify the Rails model or generator templates
 */

import { ModelFactory, type ModelConfig } from '../../record-factory/model-factory';
import { ModelConfigBuilder } from '../../record-factory/model-config';


/**
 * TypeScript interface for JobPerson model
 * Auto-generated from Rails schema
 */
export interface JobPerson {
  created_at: string;
  updated_at: string;
  id: string;
  job_id?: string;
  person_id?: string;
}


/**
 * Model configuration for JobPerson
 * Built using ModelConfigBuilder for type safety
 */
const job_personConfig: ModelConfig = new ModelConfigBuilder('job_person', 'job_people')
  .setZeroConfig({
    tableName: 'job_people',
    primaryKey: 'id'
  })
  .build();

// Add attributes to configuration
job_personConfig.attributes = [
    { name: 'created_at', type: 'datetime', nullable: false },
    { name: 'updated_at', type: 'datetime', nullable: false },
    { name: 'id', type: 'uuid', nullable: false },
    { name: 'job_id', type: 'uuid', nullable: true },
    { name: 'person_id', type: 'uuid', nullable: true }
];

// Add associations to configuration
job_personConfig.associations = [
    { name: 'job', type: 'belongs_to', className: 'Job', foreignKey: 'job_id' },
    { name: 'person', type: 'belongs_to', className: 'Person', foreignKey: 'person_id' }
];

// Add scopes to configuration
job_personConfig.scopes = [

];


/**
 * Factory instances for JobPerson
 * 
 * Generated .ts files provide only ActiveRecord (non-reactive) models.
 * For reactive models in Svelte components, import the reactive factory:
 * 
 * ```typescript
 * // In Svelte components (.svelte files):
 * import { ModelFactory } from '$lib/record-factory/model-factory.svelte';
 * import { job_personConfig } from '$lib/models/generated/job_person';
 * const JobPersonReactive = ModelFactory.createReactiveModel<JobPerson>(job_personConfig);
 * ```
 */
export const JobPersonActive = ModelFactory.createActiveModel<JobPerson>(job_personConfig);

// Default export for convenience (ActiveRecord)
export default JobPersonActive;

// Export configuration for use in Svelte components
export { job_personConfig };

// Re-export the interface
export type { JobPerson };
