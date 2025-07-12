/*
 * ⚠️  WARNING: AUTO-GENERATED FILE - DO NOT EDIT! ⚠️
 * 
 * This file was automatically generated from Rails schema introspection.
 * Any manual changes will be lost when the generator runs again.
 * 
 * Generated: 2025-07-12 23:21:25 UTC
 * Table: tasks
 * Generator: rails generate zero:factory_models
 * 
 * To regenerate: bin/rails generate zero:factory_models
 * To customize: Modify the Rails model or generator templates
 */

import { ModelFactory, type ModelConfig } from '../record-factory/model-factory';
import { ModelConfigBuilder } from '../record-factory/model-config';


/**
 * TypeScript interface for Task model
 * Auto-generated from Rails schema
 */
export interface Task {
  title?: string;
  status?: 'new_task' | 'in_progress' | 'paused' | 'successfully_completed' | 'cancelled';
  position?: number;
  created_at: string;
  updated_at: string;
  subtasks_count?: number;
  reordered_at?: string;
  lock_version: number;
  applies_to_all_targets: boolean;
  id: string;
  job_id?: string;
  assigned_to_id?: string;
  parent_id?: string;
  deleted_at?: string;
}


/**
 * Model configuration for Task
 * Built using ModelConfigBuilder for type safety
 */
const taskConfig: ModelConfig = new ModelConfigBuilder('task', 'tasks')
  .setZeroConfig({
    tableName: 'tasks',
    primaryKey: 'id'
  })
  .build();

// Add attributes to configuration
taskConfig.attributes = [
    { name: 'title', type: 'string', nullable: true },
    { name: 'status', type: 'integer', nullable: true, enum: ["new_task", "in_progress", "paused", "successfully_completed", "cancelled"] },
    { name: 'position', type: 'integer', nullable: true },
    { name: 'created_at', type: 'datetime', nullable: false },
    { name: 'updated_at', type: 'datetime', nullable: false },
    { name: 'subtasks_count', type: 'integer', nullable: true },
    { name: 'reordered_at', type: 'datetime', nullable: true },
    { name: 'lock_version', type: 'integer', nullable: false },
    { name: 'applies_to_all_targets', type: 'boolean', nullable: false },
    { name: 'id', type: 'uuid', nullable: false },
    { name: 'job_id', type: 'uuid', nullable: true },
    { name: 'assigned_to_id', type: 'uuid', nullable: true },
    { name: 'parent_id', type: 'uuid', nullable: true },
    { name: 'deleted_at', type: 'datetime', nullable: true }
];

// Add associations to configuration
taskConfig.associations = [
    { name: 'job', type: 'belongs_to', className: 'Job', foreignKey: 'job_id' },
    { name: 'assigned_to', type: 'belongs_to', className: 'User', foreignKey: 'assigned_to_id' },
    { name: 'parent', type: 'belongs_to', className: 'Task', foreignKey: 'parent_id' },
    { name: 'notes', type: 'has_many', className: 'Note', foreignKey: 'notable_id' },
    { name: 'activity_logs', type: 'has_many', className: 'ActivityLog', foreignKey: 'loggable_id' },
    { name: 'subtasks', type: 'has_many', className: 'Task', foreignKey: 'parent_id' }
];

// Add scopes to configuration
taskConfig.scopes = [
    { name: 'withDeleted', conditions: {}, description: 'Include soft-deleted records' },
    { name: 'onlyDeleted', conditions: { deleted_at: { not: null } }, description: 'Only soft-deleted records' },
    { name: 'ordered', conditions: {}, description: 'Order by position' },
    { name: 'new_task', conditions: { status: 'new_task' }, description: 'Filter by status = new_task' },
    { name: 'in_progress', conditions: { status: 'in_progress' }, description: 'Filter by status = in_progress' },
    { name: 'paused', conditions: { status: 'paused' }, description: 'Filter by status = paused' },
    { name: 'successfully_completed', conditions: { status: 'successfully_completed' }, description: 'Filter by status = successfully_completed' },
    { name: 'cancelled', conditions: { status: 'cancelled' }, description: 'Filter by status = cancelled' }
];


/**
 * Factory instances for Task
 * Provides both ReactiveRecord (Svelte) and ActiveRecord (vanilla JS) implementations
 */
export const TaskReactive = ModelFactory.createReactiveModel<Task>(taskConfig);
export const TaskActive = ModelFactory.createActiveModel<Task>(taskConfig);

// Default export for convenience
export default TaskReactive;

// Re-export the interface
export type { Task };
