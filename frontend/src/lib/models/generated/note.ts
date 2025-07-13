/*
 * ⚠️  WARNING: AUTO-GENERATED FILE - DO NOT EDIT! ⚠️
 * 
 * This file was automatically generated from Rails schema introspection.
 * Any manual changes will be lost when the generator runs again.
 * 
 * Generated: 2025-07-12 23:48:31 UTC
 * Table: notes
 * Generator: rails generate zero:factory_models
 * 
 * To regenerate: bin/rails generate zero:factory_models
 * To customize: Modify the Rails model or generator templates
 */

import { ModelFactory, type ModelConfig } from '../../record-factory/model-factory';
import { ModelConfigBuilder } from '../../record-factory/model-config';


/**
 * TypeScript interface for Note model
 * Auto-generated from Rails schema
 */
export interface Note {
  notable_type: string;
  content?: string;
  created_at: string;
  updated_at: string;
  metadata?: any;
  id: string;
  user_id?: string;
  notable_id?: string;
}


/**
 * Model configuration for Note
 * Built using ModelConfigBuilder for type safety
 */
const noteConfig: ModelConfig = new ModelConfigBuilder('note', 'notes')
  .setZeroConfig({
    tableName: 'notes',
    primaryKey: 'id'
  })
  .build();

// Add attributes to configuration
noteConfig.attributes = [
    { name: 'notable_type', type: 'string', nullable: false },
    { name: 'content', type: 'text', nullable: true },
    { name: 'created_at', type: 'datetime', nullable: false },
    { name: 'updated_at', type: 'datetime', nullable: false },
    { name: 'metadata', type: 'jsonb', nullable: true },
    { name: 'id', type: 'uuid', nullable: false },
    { name: 'user_id', type: 'uuid', nullable: true },
    { name: 'notable_id', type: 'uuid', nullable: true }
];

// Add associations to configuration
noteConfig.associations = [
    { name: 'notable', type: 'belongs_to', className: '', foreignKey: 'notable_id' },
    { name: 'user', type: 'belongs_to', className: 'User', foreignKey: 'user_id' }
];

// Add scopes to configuration
noteConfig.scopes = [

];


/**
 * Factory instances for Note
 * Provides both ReactiveRecord (Svelte) and ActiveRecord (vanilla JS) implementations
 */
export const NoteReactive = ModelFactory.createReactiveModel<Note>(noteConfig);
export const NoteActive = ModelFactory.createActiveModel<Note>(noteConfig);

// Default export for convenience
export default NoteReactive;

// Re-export the interface
export type { Note };
