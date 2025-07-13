/*
 * ⚠️  WARNING: AUTO-GENERATED FILE - DO NOT EDIT! ⚠️
 * 
 * This file was automatically generated from Rails schema introspection.
 * Any manual changes will be lost when the generator runs again.
 * 
 * Generated: 2025-07-13 04:12:41 UTC
 * Table: users
 * Generator: rails generate zero:factory_models
 * 
 * To regenerate: bin/rails generate zero:factory_models
 * To customize: Modify the Rails model or generator templates
 */

import { ModelFactory, type ModelConfig } from '../../record-factory/model-factory';
import { ModelConfigBuilder } from '../../record-factory/model-config';


/**
 * TypeScript interface for User model
 * Auto-generated from Rails schema
 */
export interface User {
  name?: string;
  email?: string;
  role?: 'admin' | 'technician' | 'customer_specialist' | 'owner';
  created_at: string;
  updated_at: string;
  password_digest?: string;
  resort_tasks_on_status_change: boolean;
  id: string;
}


/**
 * Model configuration for User
 * Built using ModelConfigBuilder for type safety
 */
const userConfig: ModelConfig = new ModelConfigBuilder('user', 'users')
  .setZeroConfig({
    tableName: 'users',
    primaryKey: 'id'
  })
  .build();

// Add attributes to configuration
userConfig.attributes = [
    { name: 'name', type: 'string', nullable: true },
    { name: 'email', type: 'string', nullable: true },
    { name: 'role', type: 'integer', nullable: true, enum: ["admin", "technician", "customer_specialist", "owner"] },
    { name: 'created_at', type: 'datetime', nullable: false },
    { name: 'updated_at', type: 'datetime', nullable: false },
    { name: 'password_digest', type: 'string', nullable: true },
    { name: 'resort_tasks_on_status_change', type: 'boolean', nullable: false },
    { name: 'id', type: 'uuid', nullable: false }
];

// Add associations to configuration
userConfig.associations = [
    { name: 'activity_logs', type: 'has_many', className: 'ActivityLog', foreignKey: 'user_id' },
    { name: 'assigned_jobs', type: 'has_many', className: 'Job', foreignKey: 'assigned_to_id' },
    { name: 'assigned_tasks', type: 'has_many', className: 'Task', foreignKey: 'assigned_to_id' },
    { name: 'job_assignments', type: 'has_many', className: 'JobAssignment', foreignKey: 'user_id' },
    { name: 'technician_jobs', type: 'has_many', className: 'Job', foreignKey: 'job_id', through: 'job_assignments' },
    { name: 'scheduled_date_time_users', type: 'has_many', className: 'ScheduledDateTimeUser', foreignKey: 'user_id' },
    { name: 'scheduled_date_times', type: 'has_many', className: 'ScheduledDateTime', foreignKey: 'scheduled_date_time_id', through: 'scheduled_date_time_users' },
    { name: 'notes', type: 'has_many', className: 'Note', foreignKey: 'user_id' },
    { name: 'created_jobs', type: 'has_many', className: 'Job', foreignKey: 'created_by_id' },
    { name: 'refresh_tokens', type: 'has_many', className: 'RefreshToken', foreignKey: 'user_id' },
    { name: 'revoked_tokens', type: 'has_many', className: 'RevokedToken', foreignKey: 'user_id' }
];

// Add scopes to configuration
userConfig.scopes = [
    { name: 'admin', conditions: { role: 'admin' }, description: 'Filter by role = admin' },
    { name: 'technician', conditions: { role: 'technician' }, description: 'Filter by role = technician' },
    { name: 'customer_specialist', conditions: { role: 'customer_specialist' }, description: 'Filter by role = customer_specialist' },
    { name: 'owner', conditions: { role: 'owner' }, description: 'Filter by role = owner' }
];


/**
 * Factory instances for User
 * 
 * Generated .ts files provide only ActiveRecord (non-reactive) models.
 * For reactive models in Svelte components, import the reactive factory:
 * 
 * ```typescript
 * // In Svelte components (.svelte files):
 * import { ModelFactory } from '$lib/record-factory/model-factory.svelte';
 * import { userConfig } from '$lib/models/generated/user';
 * const UserReactive = ModelFactory.createReactiveModel<User>(userConfig);
 * ```
 */
export const UserActive = ModelFactory.createActiveModel<User>(userConfig);

// Default export for convenience (ActiveRecord)
export default UserActive;

// Export configuration for use in Svelte components
export { userConfig };

// Re-export the interface
export type { User };
