import { Zero } from '@rocicorp/zero';
import { schema, type ZeroClient } from './generated-schema';
import { browser } from '$app/environment';
import { csrfTokenManager } from '$lib/api/csrf';

let zero: ZeroClient | null = null;

// Fetch JWT token for Zero authentication
async function getZeroToken(): Promise<string> {
  if (!browser) return '';
  
  try {
    // Get CSRF token for the POST request
    const csrfToken = await csrfTokenManager.getToken();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    } else {
      console.warn('[Zero] No CSRF token available - request will likely fail');
    }
    
    const response = await fetch('/api/v1/zero/token', {
      method: 'POST',
      headers,
      credentials: 'include', // Include cookies for authentication
      body: JSON.stringify({})
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Zero] Token fetch error response:', errorText);
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