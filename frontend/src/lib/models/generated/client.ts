/*
 * ⚠️  WARNING: AUTO-GENERATED FILE - DO NOT EDIT! ⚠️
 * 
 * This file was automatically generated from Rails schema introspection.
 * Any manual changes will be lost when the generator runs again.
 * 
 * Generated: 2025-07-13 12:13:36 UTC
 * Table: clients
 * Generator: rails generate zero:factory_models
 * 
 * To regenerate: bin/rails generate zero:factory_models
 * To customize: Modify the Rails model or generator templates
 */

import { ModelFactory, type ModelConfig } from '../../record-factory/model-factory';
import { ModelConfigBuilder } from '../../record-factory/model-config';


/**
 * TypeScript interface for ClientType 
 * Describes the data structure/shape for database records
 * Auto-generated from Rails schema
 */
export interface ClientType {
  name?: string;
  created_at: string;
  updated_at: string;
  name_normalized?: string;
  id: string;
  client_type: 'residential' | 'business';
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
    { name: 'created_at', type: 'datetime', nullable: false },
    { name: 'updated_at', type: 'datetime', nullable: false },
    { name: 'name_normalized', type: 'string', nullable: true },
    { name: 'id', type: 'uuid', nullable: false },
    { name: 'client_type', type: 'integer', nullable: false, enum: ["residential", "business"] }
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
 * Factory instances for Client (Rails-idiomatic naming)
 * 
 * Client = ActiveRecord-style class (primary interface)
 * ClientType = TypeScript interface (data structure)
 * 
 * Generated .ts files provide only ActiveRecord (non-reactive) models.
 * For reactive models in Svelte components, import the reactive factory:
 * 
 * ```typescript
 * // In Svelte components (.svelte files):
 * import { ModelFactory } from '$lib/record-factory/model-factory.svelte';
 * import { clientConfig } from '$lib/models/generated/client';
 * const ClientReactive = ModelFactory.createReactiveModel<ClientType>(clientConfig);
 * ```
 */
export const Client = ModelFactory.createActiveModel<ClientType>(clientConfig);

// Default export for convenience (ActiveRecord class)
export default Client;

// Export configuration for use in Svelte components
export { clientConfig };

// Re-export the interface type
export type { ClientType };
