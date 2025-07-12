/*
 * ⚠️  WARNING: AUTO-GENERATED FILE - DO NOT EDIT! ⚠️
 * 
 * This file was automatically generated from Rails schema introspection.
 * Any manual changes will be lost when the generator runs again.
 * 
 * Generated: 2025-07-12 23:21:25 UTC
 * Table: activity_logs
 * Generator: rails generate zero:factory_models
 * 
 * To regenerate: bin/rails generate zero:factory_models
 * To customize: Modify the Rails model or generator templates
 */

import { ModelFactory, type ModelConfig } from '../record-factory/model-factory';
import { ModelConfigBuilder } from '../record-factory/model-config';


/**
 * TypeScript interface for ActivityLog model
 * Auto-generated from Rails schema
 */
export interface ActivityLog {
  action?: string;
  loggable_type: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
  id: string;
  user_id?: string;
  client_id?: string;
  job_id?: string;
  loggable_id?: string;
}


/**
 * Model configuration for ActivityLog
 * Built using ModelConfigBuilder for type safety
 */
const activity_logConfig: ModelConfig = new ModelConfigBuilder('activity_log', 'activity_logs')
  .setZeroConfig({
    tableName: 'activity_logs',
    primaryKey: 'id'
  })
  .build();

// Add attributes to configuration
activity_logConfig.attributes = [
    { name: 'action', type: 'string', nullable: true },
    { name: 'loggable_type', type: 'string', nullable: false },
    { name: 'metadata', type: 'jsonb', nullable: true },
    { name: 'created_at', type: 'datetime', nullable: false },
    { name: 'updated_at', type: 'datetime', nullable: false },
    { name: 'id', type: 'uuid', nullable: false },
    { name: 'user_id', type: 'uuid', nullable: true },
    { name: 'client_id', type: 'uuid', nullable: true },
    { name: 'job_id', type: 'uuid', nullable: true },
    { name: 'loggable_id', type: 'uuid', nullable: true }
];

// Add associations to configuration
activity_logConfig.associations = [
    { name: 'user', type: 'belongs_to', className: 'User', foreignKey: 'user_id' },
    { name: 'loggable', type: 'belongs_to', className: '', foreignKey: 'loggable_id' },
    { name: 'client', type: 'belongs_to', className: 'Client', foreignKey: 'client_id' },
    { name: 'job', type: 'belongs_to', className: 'Job', foreignKey: 'job_id' }
];

// Add scopes to configuration
activity_logConfig.scopes = [

];


/**
 * Factory instances for ActivityLog
 * Provides both ReactiveRecord (Svelte) and ActiveRecord (vanilla JS) implementations
 */
export const ActivityLogReactive = ModelFactory.createReactiveModel<ActivityLog>(activity_logConfig);
export const ActivityLogActive = ModelFactory.createActiveModel<ActivityLog>(activity_logConfig);

// Default export for convenience
export default ActivityLogReactive;

// Re-export the interface
export type { ActivityLog };
