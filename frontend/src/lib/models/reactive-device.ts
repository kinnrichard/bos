/**
 * ReactiveDevice - ReactiveRecord model (Svelte 5 reactive)
 * 
 * Reactive Rails-compatible model for devices table.
 * Automatically updates Svelte components when data changes.
 * 
 * For non-reactive contexts, use Device instead:
 * ```typescript
 * import { Device } from './device';
 * ```
 * 
 * Generated: 2025-07-14 23:41:09 UTC
 */

import { createReactiveRecord } from './base/reactive-record';
import type { DeviceData, CreateDeviceData, UpdateDeviceData } from './types/device-data';

/**
 * ReactiveRecord configuration for Device
 */
const ReactiveDeviceConfig = {
  tableName: 'devices',
  className: 'ReactiveDevice',
  primaryKey: 'id'
};

/**
 * ReactiveDevice ReactiveRecord instance
 * 
 * @example
 * ```svelte
 * <!-- In Svelte component -->
 * <script>
 *   import { ReactiveDevice } from '$lib/models/reactive-device';
 *   
 *   // Reactive query - automatically updates when data changes
 *   const deviceQuery = ReactiveDevice.find('123');
 *   
 *   // Access reactive data
 *   $: device = deviceQuery.data;
 *   $: isLoading = deviceQuery.isLoading;
 *   $: error = deviceQuery.error;
 * </script>
 * 
 * {#if isLoading}
 *   Loading...
 * {:else if error}
 *   Error: {error.message}
 * {:else if device}
 *   <p>{device.title}</p>
 * {/if}
 * ```
 * 
 * @example
 * ```typescript
 * // Mutation operations (still async)
 * const newDevice = await ReactiveDevice.create({ title: 'New Task' });
 * await ReactiveDevice.update('123', { title: 'Updated' });
 * await ReactiveDevice.discard('123');
 * 
 * // Reactive queries
 * const allDevicesQuery = ReactiveDevice.all().all();
 * const activeDevicesQuery = ReactiveDevice.kept().all();
 * ```
 */
export const ReactiveDevice = createReactiveRecord<DeviceData>(ReactiveDeviceConfig);

/**
 * Import alias for easy switching between reactive/non-reactive
 * 
 * @example
 * ```typescript
 * // Use reactive model in Svelte components
 * import { ReactiveDevice as Device } from './reactive-device';
 * 
 * // Use like ActiveRecord but with reactive queries
 * const deviceQuery = Device.find('123');
 * ```
 */
export { ReactiveDevice as Device };

// Export types for convenience
export type { DeviceData, CreateDeviceData, UpdateDeviceData };

// Default export
export default ReactiveDevice;
