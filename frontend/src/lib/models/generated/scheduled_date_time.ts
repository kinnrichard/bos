/*
 * ⚠️  WARNING: AUTO-GENERATED FILE - DO NOT EDIT! ⚠️
 * 
 * This file was automatically generated from Rails schema introspection.
 * Any manual changes will be lost when the generator runs again.
 * 
 * Generated: 2025-07-14 05:29:41 UTC
 * Table: scheduled_date_times
 * Generator: rails generate zero:factory_models
 * 
 * To regenerate: bin/rails generate zero:factory_models
 * To customize: Modify the Rails model or generator templates
 */

import { ModelFactory, type ModelConfig } from '../../record-factory/model-factory';
import { ModelConfigBuilder } from '../../record-factory/model-config';


/**
 * TypeScript interface for ScheduledDateTimeType 
 * Describes the data structure/shape for database records
 * Auto-generated from Rails schema
 */
export interface ScheduledDateTimeType {
  schedulable_type: string;
  scheduled_type: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  id: string;
  schedulable_id?: string;
  scheduled_at?: string;
  scheduled_time_set: boolean;
}


/**
 * Model configuration for ScheduledDateTime
 * Built using ModelConfigBuilder for type safety
 */
const scheduled_date_timeConfig: ModelConfig = new ModelConfigBuilder('scheduled_date_time', 'scheduled_date_times')
  .setZeroConfig({
    tableName: 'scheduled_date_times',
    primaryKey: 'id'
  })
  .build();

// Add attributes to configuration
scheduled_date_timeConfig.attributes = [
    { name: 'schedulable_type', type: 'string', nullable: false },
    { name: 'scheduled_type', type: 'string', nullable: false },
    { name: 'notes', type: 'text', nullable: true },
    { name: 'created_at', type: 'datetime', nullable: false },
    { name: 'updated_at', type: 'datetime', nullable: false },
    { name: 'id', type: 'uuid', nullable: false },
    { name: 'schedulable_id', type: 'uuid', nullable: true },
    { name: 'scheduled_at', type: 'datetime', nullable: true },
    { name: 'scheduled_time_set', type: 'boolean', nullable: false }
];

// Add associations to configuration
scheduled_date_timeConfig.associations = [
    { name: 'schedulable', type: 'belongs_to', className: '', foreignKey: 'schedulable_id' },
    { name: 'activity_logs', type: 'has_many', className: 'ActivityLog', foreignKey: 'loggable_id' },
    { name: 'scheduled_date_time_users', type: 'has_many', className: 'ScheduledDateTimeUser', foreignKey: 'scheduled_date_time_id' },
    { name: 'users', type: 'has_many', className: 'User', foreignKey: 'user_id', through: 'scheduled_date_time_users' }
];

// Add scopes to configuration
scheduled_date_timeConfig.scopes = [

];


/**
 * Factory instances for ScheduledDateTime (Rails-idiomatic naming)
 * 
 * ScheduledDateTime = ActiveRecord-style class (primary interface)
 * ScheduledDateTimeType = TypeScript interface (data structure)
 * 
 * Generated .ts files provide only ActiveRecord (non-reactive) models.
 * For reactive models in Svelte components, import the reactive factory:
 * 
 * ```typescript
 * // In Svelte components (.svelte files):
 * import { ModelFactory } from '$lib/record-factory/model-factory.svelte';
 * import { scheduled_date_timeConfig } from '$lib/models/generated/scheduled_date_time';
 * const ScheduledDateTimeReactive = ModelFactory.createReactiveModel<ScheduledDateTimeType>(scheduled_date_timeConfig);
 * ```
 */
export const ScheduledDateTime = ModelFactory.createActiveModel<ScheduledDateTimeType>(scheduled_date_timeConfig);

// Default export for convenience (ActiveRecord class)
export default ScheduledDateTime;

// Export configuration for use in Svelte components
export { scheduled_date_timeConfig };

// Re-export the interface type
export type { ScheduledDateTimeType };
