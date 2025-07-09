import { writable, derived, type Readable } from 'svelte/store';
import { browser } from '$app/environment';
import { queryClient } from '$lib/query-client';

export interface SafeQueryOptions {
  queryKey: any[];
  queryFn: () => Promise<any>;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  retry?: boolean | number | ((failureCount: number, error: any) => boolean);
}

export interface SafeQueryResult<T = any> {
  data: T | undefined;
  isLoading: boolean;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  status: 'idle' | 'pending' | 'success' | 'error';
  fetchStatus: 'idle' | 'fetching' | 'paused';
  refetch: () => Promise<void>;
}

/**
 * Custom query wrapper that bypasses TanStack Query's Svelte 5 reactivity issues
 * by managing the query lifecycle manually with Svelte stores
 */
export function createSafeQuery<T = any>(optionsOrFactory: SafeQueryOptions | (() => SafeQueryOptions)): Readable<SafeQueryResult<T>> {
  // Create stores for query state
  const data = writable<T | undefined>(undefined);
  const isLoading = writable(false);
  const isPending = writable(false);
  const isError = writable(false);
  const error = writable<Error | null>(null);
  const status = writable<'idle' | 'pending' | 'success' | 'error'>('idle');
  const fetchStatus = writable<'idle' | 'fetching' | 'paused'>('idle');

  // Track current query key to detect changes
  let currentQueryKey: string | null = null;
  let isInitialized = false;

  // Function to get current options
  const getOptions = () => {
    return typeof optionsOrFactory === 'function' ? optionsOrFactory() : optionsOrFactory;
  };

  // Function to execute the query
  const executeQuery = async (forceRefetch = false) => {
    const options = getOptions();
    const enabled = options.enabled ?? true;
    
    if (!enabled || !browser) {
      console.log('[SAFE QUERY] Query execution skipped - enabled:', enabled, 'browser:', browser);
      return;
    }

    const queryKeyString = JSON.stringify(options.queryKey);
    
    // Check if query key has changed
    if (currentQueryKey !== queryKeyString) {
      currentQueryKey = queryKeyString;
      console.log('[SAFE QUERY] Query key changed, executing query:', options.queryKey);
    }

    try {
      // Set loading states
      isLoading.set(true);
      isPending.set(true);
      isError.set(false);
      error.set(null);
      status.set('pending');
      fetchStatus.set('fetching');

      console.log('[SAFE QUERY] Executing query with key:', options.queryKey);

      // Check if data is in cache first (unless force refetch)
      if (!forceRefetch) {
        const cachedData = queryClient.getQueryData(options.queryKey);
        if (cachedData) {
          console.log('[SAFE QUERY] Using cached data');
          data.set(cachedData);
          isLoading.set(false);
          isPending.set(false);
          status.set('success');
          fetchStatus.set('idle');
          return;
        }
      }

      // Execute the query function
      const result = await options.queryFn();

      // Cache the result
      queryClient.setQueryData(options.queryKey, result, {
        updatedAt: Date.now(),
      });

      // Update state with success
      data.set(result);
      isLoading.set(false);
      isPending.set(false);
      status.set('success');
      fetchStatus.set('idle');

      console.log('[SAFE QUERY] Query completed successfully');
    } catch (err) {
      console.error('[SAFE QUERY] Query failed:', err);
      
      // Update state with error
      isLoading.set(false);
      isPending.set(false);
      isError.set(true);
      error.set(err instanceof Error ? err : new Error(String(err)));
      status.set('error');
      fetchStatus.set('idle');
    }
  };

  // Function to manually refetch
  const refetch = async () => {
    await executeQuery(true);
  };

  // Create a reactive store that watches for changes in the options
  const optionsStore = writable(getOptions());
  
  // Update options store when factory function is called
  if (typeof optionsOrFactory === 'function') {
    // Set up a timer to periodically check for changes
    const checkInterval = setInterval(() => {
      const newOptions = getOptions();
      const newKey = JSON.stringify(newOptions.queryKey);
      
      if (currentQueryKey !== newKey) {
        console.log('[SAFE QUERY] Options changed, re-executing query');
        optionsStore.set(newOptions);
        executeQuery();
      }
    }, 100); // Check every 100ms
    
    // Clean up interval when component is destroyed
    if (browser) {
      window.addEventListener('beforeunload', () => {
        clearInterval(checkInterval);
      });
    }
  }

  // Execute query on initialization
  if (!isInitialized) {
    isInitialized = true;
    executeQuery();
  }

  // Create derived store that combines all state
  const result = derived(
    [data, isLoading, isPending, isError, error, status, fetchStatus],
    ([$data, $isLoading, $isPending, $isError, $error, $status, $fetchStatus]) => ({
      data: $data,
      isLoading: $isLoading,
      isPending: $isPending,
      isError: $isError,
      error: $error,
      status: $status,
      fetchStatus: $fetchStatus,
      refetch,
    })
  );

  return result;
}