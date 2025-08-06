/**
 * GoodJobSetting - ActiveRecord model (non-reactive)
 *
 * Promise-based Rails-compatible model for good_job_settings table.
 * Use this for server-side code, Node.js scripts, or non-reactive contexts.
 *
 * For reactive Svelte components, use ReactiveGoodJobSetting instead:
 * ```typescript
 * import { ReactiveGoodJobSetting as GoodJobSetting } from './reactive-good-job-setting';
 * ```
 *
 * Generated: 2025-08-05 22:30:27 UTC
 */

import { createActiveRecord } from './base/active-record';
import type {
  GoodJobSettingData,
  CreateGoodJobSettingData,
  UpdateGoodJobSettingData,
} from './types/good-job-setting-data';

/**
 * ActiveRecord configuration for GoodJobSetting
 */
const GoodJobSettingConfig = {
  tableName: 'good_job_settings',
  className: 'GoodJobSetting',
  primaryKey: 'id',
  supportsDiscard: false,
};

/**
 * GoodJobSetting ActiveRecord instance
 *
 * @example
 * ```typescript
 * // Find by ID (throws if not found)
 * const good_job_setting = await GoodJobSetting.find('123');
 *
 * // Find by conditions (returns null if not found)
 * const good_job_setting = await GoodJobSetting.findBy({ title: 'Test' });
 *
 * // Create new record
 * const newGoodJobSetting = await GoodJobSetting.create({ title: 'New Task' });
 *
 * // Update existing record
 * const updatedGoodJobSetting = await GoodJobSetting.update('123', { title: 'Updated' });
 *
 * // Soft delete (discard gem)
 * await GoodJobSetting.discard('123');
 *
 * // Restore discarded
 * await GoodJobSetting.undiscard('123');
 *
 * // Query with scopes
 * const allGoodJobSettings = await GoodJobSetting.all().all();
 * const activeGoodJobSettings = await GoodJobSetting.kept().all();
 * ```
 */
export const GoodJobSetting = createActiveRecord<GoodJobSettingData>(GoodJobSettingConfig);

// Epic-009: Register model relationships for includes() functionality
// No relationships defined for this model

// Export types for convenience
export type { GoodJobSettingData, CreateGoodJobSettingData, UpdateGoodJobSettingData };

// Default export
export default GoodJobSetting;
