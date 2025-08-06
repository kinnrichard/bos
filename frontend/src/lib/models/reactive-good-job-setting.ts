/**
 * ReactiveGoodJobSetting - ReactiveRecord model (Svelte 5 reactive)
 *
 * Read-only reactive Rails-compatible model for good_job_settings table.
 * Automatically updates Svelte components when data changes.
 *
 * For mutations (create/update/delete) or non-reactive contexts, use GoodJobSetting instead:
 * ```typescript
 * import { GoodJobSetting } from './good-job-setting';
 * ```
 *
 * Generated: 2025-08-05 22:30:27 UTC
 */

import { createReactiveRecord } from './base/reactive-record';
import type {
  GoodJobSettingData,
  CreateGoodJobSettingData,
  UpdateGoodJobSettingData,
} from './types/good-job-setting-data';

/**
 * ReactiveRecord configuration for GoodJobSetting
 */
const ReactiveGoodJobSettingConfig = {
  tableName: 'good_job_settings',
  className: 'ReactiveGoodJobSetting',
  primaryKey: 'id',
  supportsDiscard: false,
};

/**
 * ReactiveGoodJobSetting ReactiveRecord instance
 *
 * @example
 * ```svelte
 * <!-- In Svelte component -->
 * <script>
 *   import { ReactiveGoodJobSetting } from '$lib/models/reactive-good-job-setting';
 *
 *   // Reactive query - automatically updates when data changes
 *   const good_job_settingQuery = ReactiveGoodJobSetting.find('123');
 *
 *   // Access reactive data
 *   $: good_job_setting = good_job_settingQuery.data;
 *   $: isLoading = good_job_settingQuery.isLoading;
 *   $: error = good_job_settingQuery.error;
 * </script>
 *
 * {#if isLoading}
 *   Loading...
 * {:else if error}
 *   Error: {error.message}
 * {:else if good_job_setting}
 *   <p>{good_job_setting.title}</p>
 * {/if}
 * ```
 *
 * @example
 * ```typescript
 * // Reactive queries that automatically update
 * const allGoodJobSettingsQuery = ReactiveGoodJobSetting.all().all();
 * const activeGoodJobSettingsQuery = ReactiveGoodJobSetting.kept().all();
 * const singleGoodJobSettingQuery = ReactiveGoodJobSetting.find('123');
 *
 * // With relationships
 * const good_job_settingWithRelationsQuery = ReactiveGoodJobSetting
 *   .includes('client', 'tasks')
 *   .find('123');
 *
 * // Complex queries
 * const filteredGoodJobSettingsQuery = ReactiveGoodJobSetting
 *   .where({ status: 'active' })
 *   .orderBy('created_at', 'desc')
 *   .limit(10)
 *   .all();
 * ```
 */
export const ReactiveGoodJobSetting = createReactiveRecord<GoodJobSettingData>(
  ReactiveGoodJobSettingConfig
);

// Epic-009: Register model relationships for includes() functionality
// No relationships defined for this model

/**
 * Import alias for easy switching between reactive/non-reactive
 *
 * @example
 * ```typescript
 * // Use reactive model in Svelte components
 * import { ReactiveGoodJobSetting as GoodJobSetting } from './reactive-good-job-setting';
 *
 * // Use like ActiveRecord but with reactive queries
 * const good_job_settingQuery = GoodJobSetting.find('123');
 * ```
 */
export { ReactiveGoodJobSetting as GoodJobSetting };

// Export types for convenience
export type { GoodJobSettingData, CreateGoodJobSettingData, UpdateGoodJobSettingData };

// Default export
export default ReactiveGoodJobSetting;
