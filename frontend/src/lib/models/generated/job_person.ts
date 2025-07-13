/*
 * ⚠️  WARNING: AUTO-GENERATED FILE - DO NOT EDIT! ⚠️
 * 
 * This file was automatically generated from Rails schema introspection.
 * Any manual changes will be lost when the generator runs again.
 * 
 * Generated: 2025-07-12 23:48:31 UTC
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
 * Provides both ReactiveRecord (Svelte) and ActiveRecord (vanilla JS) implementations
 */
export const JobPersonReactive = ModelFactory.createReactiveModel<JobPerson>(job_personConfig);
export const JobPersonActive = ModelFactory.createActiveModel<JobPerson>(job_personConfig);

// Default export for convenience
export default JobPersonReactive;

// Re-export the interface
export type { JobPerson };
