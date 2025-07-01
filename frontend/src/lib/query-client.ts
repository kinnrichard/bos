import { QueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { debugAPI } from '$lib/utils/debug';

// Enhanced query client with persistence, error handling, and devtools
export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			// Cache timing optimized for different data types
			staleTime: 1000 * 60 * 5, // 5 minutes - good for most server data
			gcTime: 1000 * 60 * 30, // 30 minutes - longer retention for better UX
			
			// Conservative retry strategy
			retry: (failureCount, error: any) => {
				// Don't retry authentication errors
				if (error?.status === 401 || error?.status === 403) {
					return false;
				}
				// Don't retry client errors (4xx)
				if (error?.status >= 400 && error?.status < 500) {
					return false;
				}
				// Retry server errors up to 2 times
				return failureCount < 2;
			},
			retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
			
			// Background refetching strategy
			refetchOnWindowFocus: false, // Disable to reduce unnecessary requests
			refetchOnReconnect: 'always', // Always refetch when connection restored
			refetchOnMount: true, // Ensure fresh data on component mount
			
			// Network mode for offline capability
			networkMode: 'online', // Only run queries when online
		},
		mutations: {
			// Conservative mutation retry
			retry: (failureCount, error: any) => {
				// Never retry authentication or validation errors
				if (error?.code === 'INVALID_CSRF_TOKEN' || 
				    error?.status === 401 || 
				    error?.status === 403 || 
				    error?.status === 422) {
					return false;
				}
				// Retry server errors once
				return failureCount < 1;
			},
			retryDelay: 1000,
			
			// Network mode for mutations
			networkMode: 'online', // Only run mutations when online
		},
	},
});

// Persistence configuration for offline capability
interface PersistedQuery {
	queryKey: readonly unknown[];
	queryHash: string;
	data: any;
	dataUpdatedAt: number;
	timestamp: number;
}

// Strategic query persistence - only persist important, slowly-changing data
const PERSISTED_QUERY_KEYS = [
	'users', // User data changes infrequently
	'technicians', // Technician list is relatively stable
	// Don't persist jobs data as it changes frequently
];

const PERSISTENCE_KEY = 'bos:query-cache';
const MAX_PERSISTENCE_AGE = 1000 * 60 * 60 * 24; // 24 hours

// Save important queries to localStorage
export function persistQueryCache() {
	if (!browser) return;
	
	try {
		const cache = queryClient.getQueryCache();
		const queries = cache.getAll();
		const timestamp = Date.now();
		
		const persistedData: PersistedQuery[] = queries
			.filter(query => {
				// Only persist queries we've marked as important
				const queryKey = query.queryKey[0] as string;
				return PERSISTED_QUERY_KEYS.includes(queryKey) && 
				       query.state.data !== undefined &&
				       query.state.status === 'success';
			})
			.map(query => ({
				queryKey: query.queryKey,
				queryHash: query.queryHash,
				data: query.state.data,
				dataUpdatedAt: query.state.dataUpdatedAt,
				timestamp
			}));

		if (persistedData.length > 0) {
			localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(persistedData));
			debugAPI('Persisted %d queries to localStorage', persistedData.length);
		}
	} catch (error) {
		debugAPI('Failed to persist query cache: %o', error);
	}
}

// Restore queries from localStorage
export function restoreQueryCache() {
	if (!browser) return;
	
	try {
		const stored = localStorage.getItem(PERSISTENCE_KEY);
		if (!stored) return;
		
		const persistedData: PersistedQuery[] = JSON.parse(stored);
		const now = Date.now();
		let restoredCount = 0;
		
		persistedData.forEach(({ queryKey, data, dataUpdatedAt, timestamp }) => {
			// Skip if data is too old
			if (now - timestamp > MAX_PERSISTENCE_AGE) {
				return;
			}
			
			// Restore to cache
			queryClient.setQueryData(queryKey, data, {
				updatedAt: dataUpdatedAt
			});
			restoredCount++;
		});
		
		if (restoredCount > 0) {
			debugAPI('Restored %d queries from localStorage', restoredCount);
		}
		
		// Clean up old data
		const validData = persistedData.filter(({ timestamp }) => 
			now - timestamp <= MAX_PERSISTENCE_AGE
		);
		
		if (validData.length !== persistedData.length) {
			localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(validData));
		}
	} catch (error) {
		debugAPI('Failed to restore query cache: %o', error);
		// Clear corrupted data
		localStorage.removeItem(PERSISTENCE_KEY);
	}
}

// Clear persisted cache (useful for logout or data issues)
export function clearPersistedQueryCache() {
	if (browser) {
		localStorage.removeItem(PERSISTENCE_KEY);
		debugAPI('Cleared persisted query cache');
	}
}

let persistenceTimeout: NodeJS.Timeout | number;

// Set up automatic persistence on query success for important queries
if (browser) {
	const cache = queryClient.getQueryCache();
	
	cache.subscribe(event => {
		if (event?.type === 'updated' && event.query.state.status === 'success') {
			const queryKey = event.query.queryKey[0] as string;
			if (PERSISTED_QUERY_KEYS.includes(queryKey)) {
				// Debounce persistence to avoid excessive localStorage writes
				clearTimeout(persistenceTimeout);
				persistenceTimeout = setTimeout(persistQueryCache, 1000);
			}
		}
	});
	
	// Restore cache on startup
	restoreQueryCache();
	
	// Persist cache before page unload
	window.addEventListener('beforeunload', persistQueryCache);
	
	// Periodic cleanup of old data
	setInterval(() => {
		try {
			const stored = localStorage.getItem(PERSISTENCE_KEY);
			if (stored) {
				const data: PersistedQuery[] = JSON.parse(stored);
				const now = Date.now();
				const validData = data.filter(({ timestamp }) => 
					now - timestamp <= MAX_PERSISTENCE_AGE
				);
				if (validData.length !== data.length) {
					localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(validData));
					debugAPI('Cleaned up %d old persisted queries', data.length - validData.length);
				}
			}
		} catch (error) {
			debugAPI('Failed to cleanup persisted cache: %o', error);
		}
	}, 1000 * 60 * 60); // Cleanup every hour
}

// DevTools integration (only in development)
if (browser && import.meta.env.DEV) {
	// Expose query client to window for debugging
	(window as any).queryClient = queryClient;
	(window as any).bosQueryTools = {
		clearCache: () => queryClient.clear(),
		invalidateAll: () => queryClient.invalidateQueries(),
		persistCache: persistQueryCache,
		restoreCache: restoreQueryCache,
		clearPersistedCache: clearPersistedQueryCache,
		getCacheSize: () => queryClient.getQueryCache().getAll().length,
		getPersistedSize: () => {
			try {
				const stored = localStorage.getItem(PERSISTENCE_KEY);
				return stored ? JSON.parse(stored).length : 0;
			} catch {
				return 0;
			}
		}
	};
	
	debugAPI('Query client and debug tools available on window.bosQueryTools');
}