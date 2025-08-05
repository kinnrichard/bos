/**
 * ReactiveClientsFrontConversation - ReactiveRecord model (Svelte 5 reactive)
 *
 * Read-only reactive Rails-compatible model for clients_front_conversations table.
 * Automatically updates Svelte components when data changes.
 *
 * For mutations (create/update/delete) or non-reactive contexts, use ClientsFrontConversation instead:
 * ```typescript
 * import { ClientsFrontConversation } from './clients-front-conversation';
 * ```
 *
 * Generated: 2025-08-04 22:23:45 UTC
 */

import { createReactiveRecord } from './base/reactive-record';
import type {
  ClientsFrontConversationData,
  CreateClientsFrontConversationData,
  UpdateClientsFrontConversationData,
} from './types/clients-front-conversation-data';

/**
 * ReactiveRecord configuration for ClientsFrontConversation
 */
const ReactiveClientsFrontConversationConfig = {
  tableName: 'clients_front_conversations',
  className: 'ReactiveClientsFrontConversation',
  primaryKey: 'id',
  supportsDiscard: false,
};

/**
 * ReactiveClientsFrontConversation ReactiveRecord instance
 *
 * @example
 * ```svelte
 * <!-- In Svelte component -->
 * <script>
 *   import { ReactiveClientsFrontConversation } from '$lib/models/reactive-clients-front-conversation';
 *
 *   // Reactive query - automatically updates when data changes
 *   const clients_front_conversationQuery = ReactiveClientsFrontConversation.find('123');
 *
 *   // Access reactive data
 *   $: clients_front_conversation = clients_front_conversationQuery.data;
 *   $: isLoading = clients_front_conversationQuery.isLoading;
 *   $: error = clients_front_conversationQuery.error;
 * </script>
 *
 * {#if isLoading}
 *   Loading...
 * {:else if error}
 *   Error: {error.message}
 * {:else if clients_front_conversation}
 *   <p>{clients_front_conversation.title}</p>
 * {/if}
 * ```
 *
 * @example
 * ```typescript
 * // Reactive queries that automatically update
 * const allClientsFrontConversationsQuery = ReactiveClientsFrontConversation.all().all();
 * const activeClientsFrontConversationsQuery = ReactiveClientsFrontConversation.kept().all();
 * const singleClientsFrontConversationQuery = ReactiveClientsFrontConversation.find('123');
 *
 * // With relationships
 * const clients_front_conversationWithRelationsQuery = ReactiveClientsFrontConversation
 *   .includes('client', 'tasks')
 *   .find('123');
 *
 * // Complex queries
 * const filteredClientsFrontConversationsQuery = ReactiveClientsFrontConversation
 *   .where({ status: 'active' })
 *   .orderBy('created_at', 'desc')
 *   .limit(10)
 *   .all();
 * ```
 */
export const ReactiveClientsFrontConversation = createReactiveRecord<ClientsFrontConversationData>(
  ReactiveClientsFrontConversationConfig
);

// Epic-009: Register model relationships for includes() functionality
// No relationships defined for this model

/**
 * Import alias for easy switching between reactive/non-reactive
 *
 * @example
 * ```typescript
 * // Use reactive model in Svelte components
 * import { ReactiveClientsFrontConversation as ClientsFrontConversation } from './reactive-clients-front-conversation';
 *
 * // Use like ActiveRecord but with reactive queries
 * const clients_front_conversationQuery = ClientsFrontConversation.find('123');
 * ```
 */
export { ReactiveClientsFrontConversation as ClientsFrontConversation };

// Export types for convenience
export type {
  ClientsFrontConversationData,
  CreateClientsFrontConversationData,
  UpdateClientsFrontConversationData,
};

// Default export
export default ReactiveClientsFrontConversation;
