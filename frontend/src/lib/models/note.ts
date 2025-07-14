/**
 * Note - ActiveRecord model (non-reactive)
 * 
 * Promise-based Rails-compatible model for notes table.
 * Use this for server-side code, Node.js scripts, or non-reactive contexts.
 * 
 * For reactive Svelte components, use ReactiveNote instead:
 * ```typescript
 * import { ReactiveNote as Note } from './reactive-note';
 * ```
 * 
 * Generated: 2025-07-14 23:41:09 UTC
 */

import { createActiveRecord } from './base/active-record';
import type { NoteData, CreateNoteData, UpdateNoteData } from './types/note-data';

/**
 * ActiveRecord configuration for Note
 */
const NoteConfig = {
  tableName: 'notes',
  className: 'Note',
  primaryKey: 'id'
};

/**
 * Note ActiveRecord instance
 * 
 * @example
 * ```typescript
 * // Find by ID (throws if not found)
 * const note = await Note.find('123');
 * 
 * // Find by conditions (returns null if not found)
 * const note = await Note.findBy({ title: 'Test' });
 * 
 * // Create new record
 * const newNote = await Note.create({ title: 'New Task' });
 * 
 * // Update existing record
 * const updatedNote = await Note.update('123', { title: 'Updated' });
 * 
 * // Soft delete (discard gem)
 * await Note.discard('123');
 * 
 * // Restore discarded
 * await Note.undiscard('123');
 * 
 * // Query with scopes
 * const allNotes = await Note.all().all();
 * const activeNotes = await Note.kept().all();
 * ```
 */
export const Note = createActiveRecord<NoteData>(NoteConfig);

// Export types for convenience
export type { NoteData, CreateNoteData, UpdateNoteData };

// Default export
export default Note;
