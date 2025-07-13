/*
 * ⚠️  WARNING: AUTO-GENERATED FILE - DO NOT EDIT! ⚠️
 * 
 * This file was automatically generated from Rails schema introspection.
 * Any manual changes will be lost when the generator runs again.
 * 
 * Generated: 2025-07-13 17:29:21 UTC
 * Table: devices
 * Generator: rails generate zero:factory_models
 * 
 * To regenerate: bin/rails generate zero:factory_models
 * To customize: Modify the Rails model or generator templates
 */

import { ModelFactory, type ModelConfig } from '../../record-factory/model-factory';
import { ModelConfigBuilder } from '../../record-factory/model-config';


/**
 * TypeScript interface for DeviceType 
 * Describes the data structure/shape for database records
 * Auto-generated from Rails schema
 */
export interface DeviceType {
  name?: string;
  model?: string;
  serial_number?: string;
  location?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  id: string;
  client_id?: string;
  person_id?: string;
}


/**
 * Model configuration for Device
 * Built using ModelConfigBuilder for type safety
 */
const deviceConfig: ModelConfig = new ModelConfigBuilder('device', 'devices')
  .setZeroConfig({
    tableName: 'devices',
    primaryKey: 'id'
  })
  .build();

// Add attributes to configuration
deviceConfig.attributes = [
    { name: 'name', type: 'string', nullable: true },
    { name: 'model', type: 'string', nullable: true },
    { name: 'serial_number', type: 'string', nullable: true },
    { name: 'location', type: 'string', nullable: true },
    { name: 'notes', type: 'text', nullable: true },
    { name: 'created_at', type: 'datetime', nullable: false },
    { name: 'updated_at', type: 'datetime', nullable: false },
    { name: 'id', type: 'uuid', nullable: false },
    { name: 'client_id', type: 'uuid', nullable: true },
    { name: 'person_id', type: 'uuid', nullable: true }
];

// Add associations to configuration
deviceConfig.associations = [
    { name: 'client', type: 'belongs_to', className: 'Client', foreignKey: 'client_id' },
    { name: 'person', type: 'belongs_to', className: 'Person', foreignKey: 'person_id' },
    { name: 'activity_logs', type: 'has_many', className: 'ActivityLog', foreignKey: 'loggable_id' }
];

// Add scopes to configuration
deviceConfig.scopes = [

];


/**
 * Factory instances for Device (Rails-idiomatic naming)
 * 
 * Device = ActiveRecord-style class (primary interface)
 * DeviceType = TypeScript interface (data structure)
 * 
 * Generated .ts files provide only ActiveRecord (non-reactive) models.
 * For reactive models in Svelte components, import the reactive factory:
 * 
 * ```typescript
 * // In Svelte components (.svelte files):
 * import { ModelFactory } from '$lib/record-factory/model-factory.svelte';
 * import { deviceConfig } from '$lib/models/generated/device';
 * const DeviceReactive = ModelFactory.createReactiveModel<DeviceType>(deviceConfig);
 * ```
 */
export const Device = ModelFactory.createActiveModel<DeviceType>(deviceConfig);

// Default export for convenience (ActiveRecord class)
export default Device;

// Export configuration for use in Svelte components
export { deviceConfig };

// Re-export the interface type
export type { DeviceType };
