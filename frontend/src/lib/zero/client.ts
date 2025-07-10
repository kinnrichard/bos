import { Zero } from '@rocicorp/zero';
import { schema, type ZeroClient } from './schema';
import { browser } from '$app/environment';

let zero: ZeroClient | null = null;

// Zero client configuration
const zeroConfig = {
  schema,
  server: browser ? window.location.origin : 'http://localhost:3000',
  userID: 'dev-user-123', // Required by Zero - in production this should be dynamic
  // For development, we'll use memory store first
  kvStore: 'mem' as const,
  logLevel: 'info' as const,
};

// Initialize Zero client
export function initZero(): ZeroClient {
  if (!browser) {
    // Return a mock client for SSR
    return {} as ZeroClient;
  }

  if (!zero) {
    zero = new Zero(zeroConfig);
  }

  return zero;
}

// Get the current Zero client instance
export function getZero(): ZeroClient {
  if (!browser) {
    // Return a mock client for SSR to prevent errors
    return {} as ZeroClient;
  }
  
  if (!zero) {
    return initZero();
  }
  return zero;
}

// Close Zero connection (for cleanup)
export function closeZero(): void {
  if (zero) {
    // Zero doesn't have a close method in the current API
    // but we'll reset our reference
    zero = null;
  }
}