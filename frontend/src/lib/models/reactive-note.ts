/**
 * ReactiveNote - ReactiveRecord model (Svelte 5 reactive)
 *
 * Read-only reactive Rails-compatible model for notes table.
 * Automatically updates Svelte components when data changes.
 *
 * For mutations (create/update/delete) or non-reactive contexts, use Note instead:
 * ```typescript
 * import { Note } from './note';
 * ```
 *
 * Generated: 2025-08-04 23:23:50 UTC
 */

import { createReactiveRecord } from './base/reactive-record';
import type { NoteData, CreateNoteData, UpdateNoteData } from './types/note-data';
import { registerModelRelationships } from './base/scoped-query-base';

/**
 * ReactiveRecord configuration for Note
 */
const ReactiveNoteConfig = {
  tableName: 'notes',
  className: 'ReactiveNote',
  primaryKey: 'id',
  supportsDiscard: false,
};

/**
 * ReactiveNote ReactiveRecord instance
 *
 * @example
 * ```svelte
 * <!-- In Svelte component -->
 * <script>
 *   import { ReactiveNote } from '$lib/models/reactive-note';
 *
 *   // Reactive query - automatically updates when data changes
 *   const noteQuery = ReactiveNote.find('123');
 *
 *   // Access reactive data
 *   $: note = noteQuery.data;
 *   $: isLoading = noteQuery.isLoading;
 *   $: error = noteQuery.error;
 * </script>
 *
 * {#if isLoading}
 *   Loading...
 * {:else if error}
 *   Error: {error.message}
 * {:else if note}
 *   <p>{note.title}</p>
 * {/if}
 * ```
 *
 * @example
 * ```typescript
 * // Reactive queries that automatically update
 * const allNotesQuery = ReactiveNote.all().all();
 * const activeNotesQuery = ReactiveNote.kept().all();
 * const singleNoteQuery = ReactiveNote.find('123');
 *
 * // With relationships
 * const noteWithRelationsQuery = ReactiveNote
 *   .includes('client', 'tasks')
 *   .find('123');
 *
 * // Complex queries
 * const filteredNotesQuery = ReactiveNote
 *   .where({ status: 'active' })
 *   .orderBy('created_at', 'desc')
 *   .limit(10)
 *   .all();
 * ```
 */
export const ReactiveNote = createReactiveRecord<NoteData>(ReactiveNoteConfig);

// Epic-009: Register model relationships for includes() functionality
registerModelRelationships('notes', {
  user: { type: 'belongsTo', model: 'User' },
});

/**
 * Import alias for easy switching between reactive/non-reactive
 *
 * @example
 * ```typescript
 * // Use reactive model in Svelte components
 * import { ReactiveNote as Note } from './reactive-note';
 *
 * // Use like ActiveRecord but with reactive queries
 * const noteQuery = Note.find('123');
 * ```
 */
export { ReactiveNote as Note };

// Export types for convenience
export type { NoteData, CreateNoteData, UpdateNoteData };

// Default export
export default ReactiveNote;
