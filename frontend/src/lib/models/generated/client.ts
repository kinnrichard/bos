/*
 * ⚠️  WARNING: AUTO-GENERATED FILE - DO NOT EDIT! ⚠️
 * 
 * This file was automatically generated from Rails schema introspection.
 * Any manual changes will be lost when the generator runs again.
 * 
 * Generated: 2025-07-12 23:21:25 UTC
 * Table: clients
 * Generator: rails generate zero:factory_models
 * 
 * To regenerate: bin/rails generate zero:factory_models
 * To customize: Modify the Rails model or generator templates
 */

import { ModelFactory, type ModelConfig } from '../record-factory/model-factory';
import { ModelConfigBuilder } from '../record-factory/model-config';


/**
 * TypeScript interface for Client model
 * Auto-generated from Rails schema
 */
export interface Client {
  name?: string;
  client_type?: 'residential' | 'business';
  created_at: string;
  updated_at: string;
  name_normalized?: string;
  id: string;
}


/**
 * Model configuration for Client
 * Built using ModelConfigBuilder for type safety
 */
const clientConfig: ModelConfig = new ModelConfigBuilder('client', 'clients')
  .setZeroConfig({
    tableName: 'clients',
    primaryKey: 'id'
  })
  .build();

// Add attributes to configuration
clientConfig.attributes = [
    { name: 'name', type: 'string', nullable: true },
    { name: 'client_type', type: 'string', nullable: true, enum: ["residential", "business"] },
    { name: 'created_at', type: 'datetime', nullable: false },
    { name: 'updated_at', type: 'datetime', nullable: false },
    { name: 'name_normalized', type: 'string', nullable: true },
    { name: 'id', type: 'uuid', nullable: false }
];

// Add associations to configuration
clientConfig.associations = [
    { name: 'activity_logs', type: 'has_many', className: 'ActivityLog', foreignKey: 'loggable_id' },
    { name: 'people', type: 'has_many', className: 'Person', foreignKey: 'client_id' },
    { name: 'jobs', type: 'has_many', className: 'Job', foreignKey: 'client_id' },
    { name: 'devices', type: 'has_many', className: 'Device', foreignKey: 'client_id' }
];

// Add scopes to configuration
clientConfig.scopes = [
    { name: 'residential', conditions: { client_type: 'residential' }, description: 'Filter by client_type = residential' },
    { name: 'business', conditions: { client_type: 'business' }, description: 'Filter by client_type = business' }
];


/**
 * Factory instances for Client
 * Provides both ReactiveRecord (Svelte) and ActiveRecord (vanilla JS) implementations
 */
export const ClientReactive = ModelFactory.createReactiveModel<Client>(clientConfig);
export const ClientActive = ModelFactory.createActiveModel<Client>(clientConfig);

// Default export for convenience
export default ClientReactive;

// Re-export the interface
export type { Client };
