import { Zero } from '@rocicorp/zero';
import { schema, type ZeroClient } from './generated-schema';
import { browser } from '$app/environment';

let zero: ZeroClient | null = null;

// Fetch JWT token dynamically - called by Zero's auth function
async function fetchZeroToken(): Promise<string> {
  if (!browser) return '';
  
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
    return data.token || '';
  } catch (error) {
    console.error('Failed to fetch Zero token:', error);
    return '';
  }
}

// Get initial user ID for Zero configuration
async function getInitialUserId(): Promise<string> {
  if (!browser) return '';
  
  try {
    const response = await fetch('/api/v1/zero/token', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get user ID: ${response.status}`);
    }
    
    const data = await response.json();
    return data.user_id || '';
  } catch (error) {
    console.error('Failed to get initial user ID:', error);
    return '';
  }
}

// Token cache to avoid unnecessary API calls
let cachedToken: string | null = null;
let tokenExpiryTime: number | null = null;

// Create Zero configuration with cached token approach
async function createZeroConfig(userId: string) {
  console.log('[Zero] Creating config with userID:', userId);
  
  // Pre-fetch initial token to ensure we have it ready
  const initialToken = await fetchZeroToken();
  console.log('[Zero] Pre-fetched initial token:', initialToken ? initialToken.substring(0, 20) + '...' : 'NONE');
  
  // Cache the token for use in auth function
  cachedToken = initialToken;
  tokenExpiryTime = Date.now() + (6 * 60 * 60 * 1000); // 6 hours
  
  // Simple auth function that returns cached token or fetches new one
  const authFunction = async () => {
    console.log('[Zero] Auth function called');
    
    // Check if we have a cached token that's still valid
    if (cachedToken && tokenExpiryTime && Date.now() < tokenExpiryTime) {
      console.log('[Zero] Using cached token:', cachedToken.substring(0, 20) + '...');
      return cachedToken;
    }
    
    // Fetch fresh token
    console.log('[Zero] Fetching fresh token...');
    const token = await fetchZeroToken();
    
    if (!token || token.length < 10) {
      console.error('[Zero] Invalid token received:', token);
      throw new Error('Invalid JWT token received');
    }
    
    // Cache the new token
    cachedToken = token;
    tokenExpiryTime = Date.now() + (6 * 60 * 60 * 1000); // 6 hours
    
    console.log('[Zero] Token length:', token.length);
    console.log('[Zero] Token is valid JWT format:', token.split('.').length === 3);
    console.log('[Zero] Returning fresh token:', token.substring(0, 20) + '...');
    return token;
  };
  
  return {
    schema,
    server: browser ? `${window.location.protocol}//${window.location.hostname}:4848` : 'http://localhost:4848',
    userID: userId, // Must match JWT 'sub' field
    auth: authFunction, // Cached async function
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
    // Get initial user ID for Zero configuration
    const userId = await getInitialUserId();
    if (!userId) {
      throw new Error('Failed to get user ID for Zero');
    }
    const config = await createZeroConfig(userId);
    zero = new Zero(config);
  }

  return zero;
}

// Get the current Zero client instance
export function getZero(): ZeroClient | null {
  if (!browser) {
    // Return null for SSR - components should handle this
    return null;
  }
  
  if (!zero) {
    // If Zero is not initialized, initialize it async but return null for now
    initZero().catch(console.error);
    return null;
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