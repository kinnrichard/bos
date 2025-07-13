/*
 * ⚠️  WARNING: AUTO-GENERATED FILE - DO NOT EDIT! ⚠️
 * 
 * This file was automatically generated from Rails schema introspection.
 * Any manual changes will be lost when the generator runs again.
 * 
 * Generated: 2025-07-13 00:54:52 UTC
 * Table: scheduled_date_time_users
 * Generator: rails generate zero:factory_models
 * 
 * To regenerate: bin/rails generate zero:factory_models
 * To customize: Modify the Rails model or generator templates
 */

import { ModelFactory, type ModelConfig } from '../../record-factory/model-factory';
import { ModelConfigBuilder } from '../../record-factory/model-config';


/**
 * TypeScript interface for ScheduledDateTimeUser model
 * Auto-generated from Rails schema
 */
export interface ScheduledDateTimeUser {
  created_at: string;
  updated_at: string;
  id: string;
  scheduled_date_time_id?: string;
  user_id?: string;
}


/**
 * Model configuration for ScheduledDateTimeUser
 * Built using ModelConfigBuilder for type safety
 */
const scheduled_date_time_userConfig: ModelConfig = new ModelConfigBuilder('scheduled_date_time_user', 'scheduled_date_time_users')
  .setZeroConfig({
    tableName: 'scheduled_date_time_users',
    primaryKey: 'id'
  })
  .build();

// Add attributes to configuration
scheduled_date_time_userConfig.attributes = [
    { name: 'created_at', type: 'datetime', nullable: false },
    { name: 'updated_at', type: 'datetime', nullable: false },
    { name: 'id', type: 'uuid', nullable: false },
    { name: 'scheduled_date_time_id', type: 'uuid', nullable: true },
    { name: 'user_id', type: 'uuid', nullable: true }
];

// Add associations to configuration
scheduled_date_time_userConfig.associations = [

];

// Add scopes to configuration
scheduled_date_time_userConfig.scopes = [

];


/**
 * Factory instances for ScheduledDateTimeUser
 * 
 * Generated .ts files provide only ActiveRecord (non-reactive) models.
 * For reactive models in Svelte components, import the reactive factory:
 * 
 * ```typescript
 * // In Svelte components (.svelte files):
 * import { ModelFactory } from '$lib/record-factory/model-factory.svelte';
 * import { scheduled_date_time_userConfig } from '$lib/models/generated/scheduled_date_time_user';
 * const ScheduledDateTimeUserReactive = ModelFactory.createReactiveModel<ScheduledDateTimeUser>(scheduled_date_time_userConfig);
 * ```
 */
export const ScheduledDateTimeUserActive = ModelFactory.createActiveModel<ScheduledDateTimeUser>(scheduled_date_time_userConfig);

// Default export for convenience (ActiveRecord)
export default ScheduledDateTimeUserActive;

// Export configuration for use in Svelte components
export { scheduled_date_time_userConfig };

// Re-export the interface
export type { ScheduledDateTimeUser };
