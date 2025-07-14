/*
 * ⚠️  WARNING: AUTO-GENERATED FILE - DO NOT EDIT! ⚠️
 * 
 * This file was automatically generated from Rails schema introspection.
 * Any manual changes will be lost when the generator runs again.
 * 
 * Generated: 2025-07-14 05:29:41 UTC
 * Table: people
 * Generator: rails generate zero:factory_models
 * 
 * To regenerate: bin/rails generate zero:factory_models
 * To customize: Modify the Rails model or generator templates
 */

import { ModelFactory, type ModelConfig } from '../../record-factory/model-factory';
import { ModelConfigBuilder } from '../../record-factory/model-config';


/**
 * TypeScript interface for PersonType 
 * Describes the data structure/shape for database records
 * Auto-generated from Rails schema
 */
export interface PersonType {
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
 * Factory instances for Person (Rails-idiomatic naming)
 * 
 * Person = ActiveRecord-style class (primary interface)
 * PersonType = TypeScript interface (data structure)
 * 
 * Generated .ts files provide only ActiveRecord (non-reactive) models.
 * For reactive models in Svelte components, import the reactive factory:
 * 
 * ```typescript
 * // In Svelte components (.svelte files):
 * import { ModelFactory } from '$lib/record-factory/model-factory.svelte';
 * import { personConfig } from '$lib/models/generated/person';
 * const PersonReactive = ModelFactory.createReactiveModel<PersonType>(personConfig);
 * ```
 */
export const Person = ModelFactory.createActiveModel<PersonType>(personConfig);

// Default export for convenience (ActiveRecord class)
export default Person;

// Export configuration for use in Svelte components
export { personConfig };

// Re-export the interface type
export type { PersonType };
