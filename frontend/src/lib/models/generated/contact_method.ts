/*
 * ⚠️  WARNING: AUTO-GENERATED FILE - DO NOT EDIT! ⚠️
 * 
 * This file was automatically generated from Rails schema introspection.
 * Any manual changes will be lost when the generator runs again.
 * 
 * Generated: 2025-07-12 23:21:25 UTC
 * Table: contact_methods
 * Generator: rails generate zero:factory_models
 * 
 * To regenerate: bin/rails generate zero:factory_models
 * To customize: Modify the Rails model or generator templates
 */

import { ModelFactory, type ModelConfig } from '../record-factory/model-factory';
import { ModelConfigBuilder } from '../record-factory/model-config';


/**
 * TypeScript interface for ContactMethod model
 * Auto-generated from Rails schema
 */
export interface ContactMethod {
  value?: string;
  formatted_value?: string;
  contact_type?: 'phone' | 'email' | 'address';
  created_at: string;
  updated_at: string;
  id: string;
  person_id?: string;
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
    { name: 'contact_type', type: 'integer', nullable: true, enum: ["phone", "email", "address"] },
    { name: 'created_at', type: 'datetime', nullable: false },
    { name: 'updated_at', type: 'datetime', nullable: false },
    { name: 'id', type: 'uuid', nullable: false },
    { name: 'person_id', type: 'uuid', nullable: true }
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
 * Factory instances for ContactMethod
 * Provides both ReactiveRecord (Svelte) and ActiveRecord (vanilla JS) implementations
 */
export const ContactMethodReactive = ModelFactory.createReactiveModel<ContactMethod>(contact_methodConfig);
export const ContactMethodActive = ModelFactory.createActiveModel<ContactMethod>(contact_methodConfig);

// Default export for convenience
export default ContactMethodReactive;

// Re-export the interface
export type { ContactMethod };
