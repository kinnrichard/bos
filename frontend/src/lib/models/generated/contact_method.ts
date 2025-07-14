/*
 * ⚠️  WARNING: AUTO-GENERATED FILE - DO NOT EDIT! ⚠️
 * 
 * This file was automatically generated from Rails schema introspection.
 * Any manual changes will be lost when the generator runs again.
 * 
 * Generated: 2025-07-14 05:29:41 UTC
 * Table: contact_methods
 * Generator: rails generate zero:factory_models
 * 
 * To regenerate: bin/rails generate zero:factory_models
 * To customize: Modify the Rails model or generator templates
 */

import { ModelFactory, type ModelConfig } from '../../record-factory/model-factory';
import { ModelConfigBuilder } from '../../record-factory/model-config';


/**
 * TypeScript interface for ContactMethodType 
 * Describes the data structure/shape for database records
 * Auto-generated from Rails schema
 */
export interface ContactMethodType {
  value?: string;
  formatted_value?: string;
  created_at: string;
  updated_at: string;
  id: string;
  person_id?: string;
  contact_type: 'phone' | 'email' | 'address';
}


/**
 * Model configuration for ContactMethod
 * Built using ModelConfigBuilder for type safety
 */
const contact_methodConfig: ModelConfig = new ModelConfigBuilder('contact_method', 'contact_methods')
  .setZeroConfig({
    tableName: 'contact_methods',
    primaryKey: 'id'
  })
  .build();

// Add attributes to configuration
contact_methodConfig.attributes = [
    { name: 'value', type: 'string', nullable: true },
    { name: 'formatted_value', type: 'string', nullable: true },
    { name: 'created_at', type: 'datetime', nullable: false },
    { name: 'updated_at', type: 'datetime', nullable: false },
    { name: 'id', type: 'uuid', nullable: false },
    { name: 'person_id', type: 'uuid', nullable: true },
    { name: 'contact_type', type: 'string', nullable: false, enum: ["phone", "email", "address"] }
];

// Add associations to configuration
contact_methodConfig.associations = [
    { name: 'person', type: 'belongs_to', className: 'Person', foreignKey: 'person_id' }
];

// Add scopes to configuration
contact_methodConfig.scopes = [
    { name: 'phone', conditions: { contact_type: 'phone' }, description: 'Filter by contact_type = phone' },
    { name: 'email', conditions: { contact_type: 'email' }, description: 'Filter by contact_type = email' },
    { name: 'address', conditions: { contact_type: 'address' }, description: 'Filter by contact_type = address' }
];


/**
 * Factory instances for ContactMethod (Rails-idiomatic naming)
 * 
 * ContactMethod = ActiveRecord-style class (primary interface)
 * ContactMethodType = TypeScript interface (data structure)
 * 
 * Generated .ts files provide only ActiveRecord (non-reactive) models.
 * For reactive models in Svelte components, import the reactive factory:
 * 
 * ```typescript
 * // In Svelte components (.svelte files):
 * import { ModelFactory } from '$lib/record-factory/model-factory.svelte';
 * import { contact_methodConfig } from '$lib/models/generated/contact_method';
 * const ContactMethodReactive = ModelFactory.createReactiveModel<ContactMethodType>(contact_methodConfig);
 * ```
 */
export const ContactMethod = ModelFactory.createActiveModel<ContactMethodType>(contact_methodConfig);

// Default export for convenience (ActiveRecord class)
export default ContactMethod;

// Export configuration for use in Svelte components
export { contact_methodConfig };

// Re-export the interface type
export type { ContactMethodType };
