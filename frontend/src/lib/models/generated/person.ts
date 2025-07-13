/*
 * ⚠️  WARNING: AUTO-GENERATED FILE - DO NOT EDIT! ⚠️
 * 
 * This file was automatically generated from Rails schema introspection.
 * Any manual changes will be lost when the generator runs again.
 * 
 * Generated: 2025-07-12 23:48:31 UTC
 * Table: people
 * Generator: rails generate zero:factory_models
 * 
 * To regenerate: bin/rails generate zero:factory_models
 * To customize: Modify the Rails model or generator templates
 */

import { ModelFactory, type ModelConfig } from '../../record-factory/model-factory';
import { ModelConfigBuilder } from '../../record-factory/model-config';


/**
 * TypeScript interface for Person model
 * Auto-generated from Rails schema
 */
export interface Person {
  name?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  id: string;
  client_id?: string;
}


/**
 * Model configuration for Person
 * Built using ModelConfigBuilder for type safety
 */
const personConfig: ModelConfig = new ModelConfigBuilder('person', 'people')
  .setZeroConfig({
    tableName: 'people',
    primaryKey: 'id'
  })
  .build();

// Add attributes to configuration
personConfig.attributes = [
    { name: 'name', type: 'string', nullable: true },
    { name: 'notes', type: 'text', nullable: true },
    { name: 'created_at', type: 'datetime', nullable: false },
    { name: 'updated_at', type: 'datetime', nullable: false },
    { name: 'id', type: 'uuid', nullable: false },
    { name: 'client_id', type: 'uuid', nullable: true }
];

// Add associations to configuration
personConfig.associations = [
    { name: 'client', type: 'belongs_to', className: 'Client', foreignKey: 'client_id' },
    { name: 'activity_logs', type: 'has_many', className: 'ActivityLog', foreignKey: 'loggable_id' },
    { name: 'contact_methods', type: 'has_many', className: 'ContactMethod', foreignKey: 'person_id' },
    { name: 'devices', type: 'has_many', className: 'Device', foreignKey: 'person_id' }
];

// Add scopes to configuration
personConfig.scopes = [

];


/**
 * Factory instances for Person
 * Provides both ReactiveRecord (Svelte) and ActiveRecord (vanilla JS) implementations
 */
export const PersonReactive = ModelFactory.createReactiveModel<Person>(personConfig);
export const PersonActive = ModelFactory.createActiveModel<Person>(personConfig);

// Default export for convenience
export default PersonReactive;

// Re-export the interface
export type { Person };
