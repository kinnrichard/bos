/**
 * ReactivePerson - ReactiveRecord model (Svelte 5 reactive)
 * 
 * Reactive Rails-compatible model for people table.
 * Automatically updates Svelte components when data changes.
 * 
 * For non-reactive contexts, use Person instead:
 * ```typescript
 * import { Person } from './person';
 * ```
 * 
 * Generated: 2025-07-19 14:26:39 UTC
 */

import { createReactiveRecord } from './base/reactive-record';
import type { PersonData, CreatePersonData, UpdatePersonData } from './types/person-data';
import { registerModelRelationships } from './base/scoped-query-base';

/**
 * ReactiveRecord configuration for Person
 */
const ReactivePersonConfig = {
  tableName: 'people',
  className: 'ReactivePerson',
  primaryKey: 'id',
  supportsDiscard: false
};

/**
 * ReactivePerson ReactiveRecord instance
 * 
 * @example
 * ```svelte
 * <!-- In Svelte component -->
 * <script>
 *   import { ReactivePerson } from '$lib/models/reactive-person';
 *   
 *   // Reactive query - automatically updates when data changes
 *   const personQuery = ReactivePerson.find('123');
 *   
 *   // Access reactive data
 *   $: person = personQuery.data;
 *   $: isLoading = personQuery.isLoading;
 *   $: error = personQuery.error;
 * </script>
 * 
 * {#if isLoading}
 *   Loading...
 * {:else if error}
 *   Error: {error.message}
 * {:else if person}
 *   <p>{person.title}</p>
 * {/if}
 * ```
 * 
 * @example
 * ```typescript
 * // Mutation operations (still async)
 * const newPerson = await ReactivePerson.create({ title: 'New Task' });
 * await ReactivePerson.update('123', { title: 'Updated' });
 * await ReactivePerson.discard('123');
 * 
 * // Reactive queries
 * const allPersonsQuery = ReactivePerson.all().all();
 * const activePersonsQuery = ReactivePerson.kept().all();
 * ```
 */
export const ReactivePerson = createReactiveRecord<PersonData>(ReactivePersonConfig);

// Epic-009: Register model relationships for includes() functionality
registerModelRelationships('people', {
  client: { type: 'belongsTo', model: 'Client' },
  activityLogs: { type: 'hasMany', model: 'ActivityLog' },
  contactMethods: { type: 'hasMany', model: 'ContactMethod' },
  devices: { type: 'hasMany', model: 'Device' }
});


/**
 * Import alias for easy switching between reactive/non-reactive
 * 
 * @example
 * ```typescript
 * // Use reactive model in Svelte components
 * import { ReactivePerson as Person } from './reactive-person';
 * 
 * // Use like ActiveRecord but with reactive queries
 * const personQuery = Person.find('123');
 * ```
 */
export { ReactivePerson as Person };

// Export types for convenience
export type { PersonData, CreatePersonData, UpdatePersonData };

// Default export
export default ReactivePerson;
