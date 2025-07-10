import { Zero } from '@rocicorp/zero';
import { schema, type ZeroClient } from './schema';
import { browser } from '$app/environment';

let zero: ZeroClient | null = null;

// Fetch JWT token for Zero authentication
async function getZeroToken(): Promise<string> {
  if (!browser) return '';
  
  try {
    const response = await fetch('/api/v1/zero/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // For development, let the controller create a default user
      body: JSON.stringify({})
    });
    
    if (!response.ok) {
      throw new Error(`Token fetch failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Failed to fetch Zero token:', error);
    return '';
  }
}

// Zero client configuration
const zeroConfig = {
  schema,
  server: browser ? `${window.location.protocol}//${window.location.hostname}:4848` : 'http://localhost:4848',
  userID: 'dev-user-123', // Will be overridden by JWT
  auth: browser ? getZeroToken : undefined,
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