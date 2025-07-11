// Zero Native Reactivity Runes for Svelte 5
// Implements Zero's native addListener for true real-time updates

import { getZero } from './zero-client';

/**
 * Custom Svelte 5 rune for Zero reactive queries
 * Uses Zero's native addListener API instead of polling
 * 
 * @param queryBuilder - Zero query builder (e.g., Job.all())
 * @param defaultValue - Default value to return while loading
 * @returns Reactive state with data, isLoading, and error
 * 
 * @example
 * ```typescript
 * import { fZero } from '$lib/zero/runes';
 * import { Job } from '$lib/zero/models/job.generated';
 * 
 * const jobsQuery = fZero(Job.all(), []);
 * 
 * // Access reactive state
 * jobsQuery.data      // Current data
 * jobsQuery.isLoading // Loading state
 * jobsQuery.error     // Error state
 * ```
 */
export function fZero<T>(queryBuilder: any, defaultValue: T[] = [] as T[]) {
  let data = $state(defaultValue);
  let isLoading = $state(true);
  let error = $state<Error | null>(null);
  
  // ✨ USE $effect FOR EXTERNAL SUBSCRIPTIONS (NOT onMount)
  $effect(() => {
    let view: any = null;
    let removeListener: (() => void) | null = null;
    
    try {
      // Check if queryBuilder is available
      if (!queryBuilder) {
        console.log('🔍 fZero: Query builder not ready, waiting...');
        isLoading = true;
        error = null;
        return;
      }
      
      console.log('🔍 fZero: Creating materialized view');
      view = queryBuilder.materialize();
      
      // Set up Zero's native listener for real-time updates
      removeListener = view.addListener((newData: T[]) => {
        console.log('🔥 ZERO DATA CHANGED! New count:', newData?.length || 0);
        data = newData || defaultValue;
        isLoading = false;
        error = null;
      });
      
      // Get initial data synchronously
      const initialData = view.data;
      if (initialData !== undefined && initialData !== null) {
        data = initialData;
        isLoading = false;
        error = null;
      }
      
      console.log('🔍 fZero: Setup complete with initial data:', initialData?.length || 'null');
      
    } catch (err) {
      console.error('🔍 fZero: Error during setup:', err);
      error = err instanceof Error ? err : new Error('Unknown error');
      isLoading = false;
    }
    
    // ✨ CLEANUP RETURNED FROM $effect - SVELTE 5 IDIOMATIC
    return () => {
      if (removeListener) {
        console.log('🔍 fZero: Removing listener');
        removeListener();
      }
      if (view) {
        console.log('🔍 fZero: Destroying view');
        view.destroy();
      }
    };
  });
  
  return {
    get data() { return data; },
    get isLoading() { return isLoading; },
    get error() { return error; }
  };
}

/**
 * Custom Svelte 5 rune for single Zero record queries
 * Uses Zero's native addListener API for real-time updates
 * 
 * @param queryBuilder - Zero query builder (e.g., Job.find(id))
 * @param defaultValue - Default value to return while loading
 * @returns Reactive state with data, isLoading, and error
 * 
 * @example
 * ```typescript
 * import { fZeroOne } from '$lib/zero/runes';
 * import { Job } from '$lib/zero/models/job.generated';
 * 
 * const jobQuery = fZeroOne(Job.find('job-id'), null);
 * 
 * // Access reactive state
 * jobQuery.data      // Current data (single record or null)
 * jobQuery.isLoading // Loading state
 * jobQuery.error     // Error state
 * ```
 */
export function fZeroOne<T>(queryBuilder: any, defaultValue: T | null = null) {
  let data = $state(defaultValue);
  let isLoading = $state(true);
  let error = $state<Error | null>(null);
  
  // ✨ USE $effect FOR EXTERNAL SUBSCRIPTIONS (NOT onMount)
  $effect(() => {
    let view: any = null;
    let removeListener: (() => void) | null = null;
    
    try {
      // Check if queryBuilder is available
      if (!queryBuilder) {
        console.log('🔍 fZeroOne: Query builder not ready, waiting...');
        isLoading = true;
        error = null;
        return;
      }
      
      console.log('🔍 fZeroOne: Creating materialized view');
      view = queryBuilder.materialize();
      
      // Set up Zero's native listener for real-time updates
      removeListener = view.addListener((newData: T | null) => {
        console.log('🔥 ZERO DATA CHANGED! New data:', newData ? 'present' : 'null');
        data = newData || defaultValue;
        isLoading = false;
        error = null;
      });
      
      // Get initial data synchronously
      const initialData = view.data;
      if (initialData !== undefined) {
        data = initialData;
        isLoading = false;
        error = null;
      }
      
      console.log('🔍 fZeroOne: Setup complete with initial data:', initialData ? 'present' : 'null');
      
    } catch (err) {
      console.error('🔍 fZeroOne: Error during setup:', err);
      error = err instanceof Error ? err : new Error('Unknown error');
      isLoading = false;
    }
    
    // ✨ CLEANUP RETURNED FROM $effect - SVELTE 5 IDIOMATIC
    return () => {
      if (removeListener) {
        console.log('🔍 fZeroOne: Removing listener');
        removeListener();
      }
      if (view) {
        console.log('🔍 fZeroOne: Destroying view');
        view.destroy();
      }
    };
  });
  
  return {
    get data() { return data; },
    get isLoading() { return isLoading; },
    get error() { return error; }
  };
}