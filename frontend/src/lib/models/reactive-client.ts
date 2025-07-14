/**
 * ReactiveClient - ReactiveRecord model (Svelte 5 reactive)
 * 
 * Reactive Rails-compatible model for clients table.
 * Automatically updates Svelte components when data changes.
 * 
 * For non-reactive contexts, use Client instead:
 * ```typescript
 * import { Client } from './client';
 * ```
 * 
 * Generated: 2025-07-14 20:18:46 UTC
 */

import { createReactiveRecord } from './base/reactive-record';
import type { ClientData, CreateClientData, UpdateClientData } from './types/client-data';

/**
 * ReactiveRecord configuration for Client
 */
const ReactiveClientConfig = {
  tableName: 'clients',
  className: 'ReactiveClient',
  primaryKey: 'id'
};

/**
 * ReactiveClient ReactiveRecord instance
 * 
 * @example
 * ```svelte
 * <!-- In Svelte component -->
 * <script>
 *   import { ReactiveClient } from '$lib/models/reactive-client';
 *   
 *   // Reactive query - automatically updates when data changes
 *   const clientQuery = ReactiveClient.find('123');
 *   
 *   // Access reactive data
 *   $: client = clientQuery.data;
 *   $: isLoading = clientQuery.isLoading;
 *   $: error = clientQuery.error;
 * </script>
 * 
 * {#if isLoading}
 *   Loading...
 * {:else if error}
 *   Error: {error.message}
 * {:else if client}
 *   <p>{client.title}</p>
 * {/if}
 * ```
 * 
 * @example
 * ```typescript
 * // Mutation operations (still async)
 * const newClient = await ReactiveClient.create({ title: 'New Task' });
 * await ReactiveClient.update('123', { title: 'Updated' });
 * await ReactiveClient.discard('123');
 * 
 * // Reactive queries
 * const allClientsQuery = ReactiveClient.all().all();
 * const activeClientsQuery = ReactiveClient.kept().all();
 * ```
 */
export const ReactiveClient = createReactiveRecord<ClientData>(ReactiveClientConfig);

/**
 * Import alias for easy switching between reactive/non-reactive
 * 
 * @example
 * ```typescript
 * // Use reactive model in Svelte components
 * import { ReactiveClient as Client } from './reactive-client';
 * 
 * // Use like ActiveRecord but with reactive queries
 * const clientQuery = Client.find('123');
 * ```
 */
export { ReactiveClient as Client };

// Export types for convenience
export type { ClientData, CreateClientData, UpdateClientData };

// Default export
export default ReactiveClient;
