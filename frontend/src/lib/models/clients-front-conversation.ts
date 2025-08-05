/**
 * ClientsFrontConversation - ActiveRecord model (non-reactive)
 *
 * Promise-based Rails-compatible model for clients_front_conversations table.
 * Use this for server-side code, Node.js scripts, or non-reactive contexts.
 *
 * For reactive Svelte components, use ReactiveClientsFrontConversation instead:
 * ```typescript
 * import { ReactiveClientsFrontConversation as ClientsFrontConversation } from './reactive-clients-front-conversation';
 * ```
 *
 * Generated: 2025-08-04 22:23:45 UTC
 */

import { createActiveRecord } from './base/active-record';
import type {
  ClientsFrontConversationData,
  CreateClientsFrontConversationData,
  UpdateClientsFrontConversationData,
} from './types/clients-front-conversation-data';

/**
 * ActiveRecord configuration for ClientsFrontConversation
 */
const ClientsFrontConversationConfig = {
  tableName: 'clients_front_conversations',
  className: 'ClientsFrontConversation',
  primaryKey: 'id',
  supportsDiscard: false,
};

/**
 * ClientsFrontConversation ActiveRecord instance
 *
 * @example
 * ```typescript
 * // Find by ID (throws if not found)
 * const clients_front_conversation = await ClientsFrontConversation.find('123');
 *
 * // Find by conditions (returns null if not found)
 * const clients_front_conversation = await ClientsFrontConversation.findBy({ title: 'Test' });
 *
 * // Create new record
 * const newClientsFrontConversation = await ClientsFrontConversation.create({ title: 'New Task' });
 *
 * // Update existing record
 * const updatedClientsFrontConversation = await ClientsFrontConversation.update('123', { title: 'Updated' });
 *
 * // Soft delete (discard gem)
 * await ClientsFrontConversation.discard('123');
 *
 * // Restore discarded
 * await ClientsFrontConversation.undiscard('123');
 *
 * // Query with scopes
 * const allClientsFrontConversations = await ClientsFrontConversation.all().all();
 * const activeClientsFrontConversations = await ClientsFrontConversation.kept().all();
 * ```
 */
export const ClientsFrontConversation = createActiveRecord<ClientsFrontConversationData>(
  ClientsFrontConversationConfig
);

// Epic-009: Register model relationships for includes() functionality
// No relationships defined for this model

// Export types for convenience
export type {
  ClientsFrontConversationData,
  CreateClientsFrontConversationData,
  UpdateClientsFrontConversationData,
};

// Default export
export default ClientsFrontConversation;
