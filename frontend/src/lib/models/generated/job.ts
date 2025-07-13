/*
 * ⚠️  WARNING: AUTO-GENERATED FILE - DO NOT EDIT! ⚠️
 * 
 * This file was automatically generated from Rails schema introspection.
 * Any manual changes will be lost when the generator runs again.
 * 
 * Generated: 2025-07-13 12:13:36 UTC
 * Table: jobs
 * Generator: rails generate zero:factory_models
 * 
 * To regenerate: bin/rails generate zero:factory_models
 * To customize: Modify the Rails model or generator templates
 */

import { ModelFactory, type ModelConfig } from '../../record-factory/model-factory';
import { ModelConfigBuilder } from '../../record-factory/model-config';


/**
 * TypeScript interface for JobType 
 * Describes the data structure/shape for database records
 * Auto-generated from Rails schema
 */
export interface JobType {
  title?: string;
  status?: 'open' | 'in_progress' | 'paused' | 'waiting_for_customer' | 'waiting_for_scheduled_appointment' | 'successfully_completed' | 'cancelled';
  priority?: 'critical' | 'high' | 'normal' | 'low' | 'proactive_followup';
  created_at: string;
  updated_at: string;
  description?: string;
  lock_version: number;
  id: string;
  client_id?: string;
  created_by_id?: string;
  due_at?: string;
  due_time_set: boolean;
  starts_at?: string;
  start_time_set: boolean;
}


/**
 * Model configuration for Job
 * Built using ModelConfigBuilder for type safety
 */
const jobConfig: ModelConfig = new ModelConfigBuilder('job', 'jobs')
  .setZeroConfig({
    tableName: 'jobs',
    primaryKey: 'id'
  })
  .build();

// Add attributes to configuration
jobConfig.attributes = [
    { name: 'title', type: 'string', nullable: true },
    { name: 'status', type: 'integer', nullable: true, enum: ["open", "in_progress", "paused", "waiting_for_customer", "waiting_for_scheduled_appointment", "successfully_completed", "cancelled"] },
    { name: 'priority', type: 'integer', nullable: true, enum: ["critical", "high", "normal", "low", "proactive_followup"] },
    { name: 'created_at', type: 'datetime', nullable: false },
    { name: 'updated_at', type: 'datetime', nullable: false },
    { name: 'description', type: 'text', nullable: true },
    { name: 'lock_version', type: 'integer', nullable: false },
    { name: 'id', type: 'uuid', nullable: false },
    { name: 'client_id', type: 'uuid', nullable: true },
    { name: 'created_by_id', type: 'uuid', nullable: true },
    { name: 'due_at', type: 'datetime', nullable: true },
    { name: 'due_time_set', type: 'boolean', nullable: false },
    { name: 'starts_at', type: 'datetime', nullable: true },
    { name: 'start_time_set', type: 'boolean', nullable: false }
];

// Add associations to configuration
jobConfig.associations = [
    { name: 'client', type: 'belongs_to', className: 'Client', foreignKey: 'client_id' },
    { name: 'created_by', type: 'belongs_to', className: 'User', foreignKey: 'created_by_id' },
    { name: 'activity_logs', type: 'has_many', className: 'ActivityLog', foreignKey: 'loggable_id' },
    { name: 'job_assignments', type: 'has_many', className: 'JobAssignment', foreignKey: 'job_id' },
    { name: 'technicians', type: 'has_many', className: 'User', foreignKey: 'user_id', through: 'job_assignments' },
    { name: 'job_people', type: 'has_many', className: 'JobPerson', foreignKey: 'job_id' },
    { name: 'people', type: 'has_many', className: 'Person', foreignKey: 'person_id', through: 'job_people' },
    { name: 'tasks', type: 'has_many', className: 'Task', foreignKey: 'job_id' },
    { name: 'notes', type: 'has_many', className: 'Note', foreignKey: 'notable_id' },
    { name: 'scheduled_date_times', type: 'has_many', className: 'ScheduledDateTime', foreignKey: 'schedulable_id' }
];

// Add scopes to configuration
jobConfig.scopes = [
    { name: 'open', conditions: { status: 'open' }, description: 'Filter by status = open' },
    { name: 'in_progress', conditions: { status: 'in_progress' }, description: 'Filter by status = in_progress' },
    { name: 'paused', conditions: { status: 'paused' }, description: 'Filter by status = paused' },
    { name: 'waiting_for_customer', conditions: { status: 'waiting_for_customer' }, description: 'Filter by status = waiting_for_customer' },
    { name: 'waiting_for_scheduled_appointment', conditions: { status: 'waiting_for_scheduled_appointment' }, description: 'Filter by status = waiting_for_scheduled_appointment' },
    { name: 'successfully_completed', conditions: { status: 'successfully_completed' }, description: 'Filter by status = successfully_completed' },
    { name: 'cancelled', conditions: { status: 'cancelled' }, description: 'Filter by status = cancelled' },
    { name: 'critical', conditions: { priority: 'critical' }, description: 'Filter by priority = critical' },
    { name: 'high', conditions: { priority: 'high' }, description: 'Filter by priority = high' },
    { name: 'normal', conditions: { priority: 'normal' }, description: 'Filter by priority = normal' },
    { name: 'low', conditions: { priority: 'low' }, description: 'Filter by priority = low' },
    { name: 'proactive_followup', conditions: { priority: 'proactive_followup' }, description: 'Filter by priority = proactive_followup' }
];


/**
 * Factory instances for Job (Rails-idiomatic naming)
 * 
 * Job = ActiveRecord-style class (primary interface)
 * JobType = TypeScript interface (data structure)
 * 
 * Generated .ts files provide only ActiveRecord (non-reactive) models.
 * For reactive models in Svelte components, import the reactive factory:
 * 
 * ```typescript
 * // In Svelte components (.svelte files):
 * import { ModelFactory } from '$lib/record-factory/model-factory.svelte';
 * import { jobConfig } from '$lib/models/generated/job';
 * const JobReactive = ModelFactory.createReactiveModel<JobType>(jobConfig);
 * ```
 */
export const Job = ModelFactory.createActiveModel<JobType>(jobConfig);

// Default export for convenience (ActiveRecord class)
export default Job;

// Export configuration for use in Svelte components
export { jobConfig };

// Re-export the interface type
export type { JobType };
