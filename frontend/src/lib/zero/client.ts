import { Zero } from '@rocicorp/zero';
import { schema, type ZeroClient } from './generated-schema';
import { browser } from '$app/environment';

let zero: ZeroClient | null = null;

// Fetch JWT token and user ID for Zero authentication
async function getZeroAuth(): Promise<{ token: string; userId: string }> {
  if (!browser) return { token: '', userId: '' };
  
  console.log('[Zero] Fetching JWT token...');
  
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    const response = await fetch('/api/v1/zero/token', {
      method: 'GET',
      headers,
      credentials: 'include' // Include cookies for authentication
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Zero] Token fetch error response:', errorText);
      throw new Error(`Token fetch failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[Zero] Successfully fetched JWT token:', data.token?.substring(0, 20) + '...');
    console.log('[Zero] User ID:', data.user_id);
    return { token: data.token, userId: data.user_id };
  } catch (error) {
    console.error('Failed to fetch Zero token:', error);
    return { token: '', userId: '' };
  }
}

// Create Zero configuration with the token and user ID
function createZeroConfig(token: string, userId: string) {
  console.log('[Zero] Creating config with token:', token ? token.substring(0, 20) + '...' : 'MISSING');
  console.log('[Zero] Creating config with userID:', userId);
  console.log('[Zero] Token length:', token.length);
  
  // Try passing the token directly instead of as a function
  return {
    schema,
    server: browser ? `${window.location.protocol}//${window.location.hostname}:4848` : 'http://localhost:4848',
    userID: userId, // Must match JWT 'sub' field
    auth: token, // Try static token instead of function
    // For development, we'll use memory store first
    kvStore: 'mem' as const,
    logLevel: 'info' as const,
  };
}

// Initialize Zero client
export async function initZero(): Promise<ZeroClient> {
  if (!browser) {
    // Return a mock client for SSR
    return {} as ZeroClient;
  }

  if (!zero) {
    // Pre-fetch the token and user ID before creating Zero client
    const { token, userId } = await getZeroAuth();
    if (!token || !userId) {
      throw new Error('Failed to get authentication credentials for Zero');
    }
    const config = createZeroConfig(token, userId);
    zero = new Zero(config);
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
    // If Zero is not initialized, initialize it async
    initZero().catch(console.error);
    return {} as ZeroClient;
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