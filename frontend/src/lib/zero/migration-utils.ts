/**
 * Migration utilities to help transition from TanStack Query to Zero
 * These provide compatibility wrappers and migration helpers
 */

import type { Readable } from 'svelte/store';

/**
 * Compatibility wrapper to make Zero reactive queries look like TanStack queries
 * This helps during migration by providing the same interface
 */
export function wrapZeroQuery<T>(zeroQuery: Readable<T>) {
  return {
    data: zeroQuery,
    isLoading: false, // Zero queries are always loaded (local-first)
    isError: false,   // Zero handles errors internally
    error: null,
    refetch: () => {}, // Zero auto-refetches
    
    // Deprecated TanStack properties (for compatibility)
    isSuccess: true,
    isFetching: false,
    status: 'success' as const,
  };
}

/**
 * Migration helper to gradually replace TanStack hooks
 * Allows components to use either hook system during transition
 */
export function createMigrationHook<T>(
  tanstackHook: () => any,
  zeroHook: () => Readable<T>,
  useZero: boolean = false
) {
  return function migrationHook() {
    if (useZero) {
      return wrapZeroQuery(zeroHook());
    } else {
      return tanstackHook();
    }
  };
}

/**
 * Type converter to help transition data structures
 * Zero may have slightly different data shapes than our current API
 */
export function convertZeroUserToApiUser(zeroUser: any): any {
  return {
    id: zeroUser.id,
    uuid: zeroUser.uuid,
    email: zeroUser.email,
    name: zeroUser.name,
    role: zeroUser.role,
    attributes: {
      email: zeroUser.email,
      name: zeroUser.name,
      role: zeroUser.role,
      resort_tasks_on_status_change: zeroUser.resort_tasks_on_status_change,
      created_at: zeroUser.created_at,
      updated_at: zeroUser.updated_at,
    }
  };
}

/**
 * Batch conversion utility for arrays
 */
export function convertZeroUsersToApiUsers(zeroUsers: any[]): any[] {
  return zeroUsers?.map(convertZeroUserToApiUser) || [];
}

/**
 * Feature flag system for gradual migration
 * Set environment variables to control which entities use Zero
 */
export const migrationFlags = {
  useZeroForUsers: import.meta.env.VITE_ZERO_USERS === 'true',
  useZeroForClients: import.meta.env.VITE_ZERO_CLIENTS === 'true', 
  useZeroForJobs: import.meta.env.VITE_ZERO_JOBS === 'true',
  useZeroForTasks: import.meta.env.VITE_ZERO_TASKS === 'true',
};

/**
 * Debug helper to compare TanStack vs Zero data
 */
export function compareMigrationData(tanstackData: any, zeroData: any, entityName: string) {
  if (import.meta.env.DEV) {
    console.group(`🔄 Migration Data Comparison: ${entityName}`);
    console.log('TanStack data:', tanstackData);
    console.log('Zero data:', zeroData);
    
    // Basic comparison
    const tanstackCount = Array.isArray(tanstackData) ? tanstackData.length : (tanstackData ? 1 : 0);
    const zeroCount = Array.isArray(zeroData) ? zeroData.length : (zeroData ? 1 : 0);
    
    console.log(`Count comparison: TanStack=${tanstackCount}, Zero=${zeroCount}`);
    console.groupEnd();
  }
}