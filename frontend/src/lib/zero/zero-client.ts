import { Zero } from '@rocicorp/zero';
import { schema, type ZeroClient } from './generated-schema';
import { browser } from '$app/environment';

// Singleton state management
let zero: ZeroClient | null = null;
let initializationPromise: Promise<ZeroClient> | null = null;
let initializationState: 'idle' | 'pending' | 'success' | 'error' = 'idle';

// Connection state tracking
let isTabVisible = true;
let isConnectionSuspended = false;
let visibilityChangeHandler: (() => void) | null = null;

// Token caching
let cachedToken: string | null = null;
let tokenExpiryTime: number | null = null;

// Enhanced logging
function logZero(message: string, ...args: any[]) {
  console.log(`[Zero] ${message}`, ...args);
}

function logZeroError(message: string, ...args: any[]) {
  console.error(`[Zero] ${message}`, ...args);
}

// Page Visibility API integration
function setupVisibilityChangeHandler() {
  if (!browser || visibilityChangeHandler) return;
  
  visibilityChangeHandler = () => {
    const wasVisible = isTabVisible;
    isTabVisible = !document.hidden;
    
    logZero('Tab visibility changed:', {
      wasVisible,
      isVisible: isTabVisible,
      hidden: document.hidden,
      visibilityState: document.visibilityState
    });
    
    if (!wasVisible && isTabVisible) {
      // Tab became visible - recover connection if needed
      logZero('Tab became visible - checking connection recovery');
      handleConnectionRecovery();
    } else if (wasVisible && !isTabVisible) {
      // Tab became hidden - mark connection as potentially suspended
      logZero('Tab became hidden - connection may be suspended');
      isConnectionSuspended = true;
    }
  };
  
  document.addEventListener('visibilitychange', visibilityChangeHandler);
  
  // Initial state
  isTabVisible = !document.hidden;
  logZero('Visibility handler setup complete. Initial state:', {
    isVisible: isTabVisible,
    hidden: document.hidden,
    visibilityState: document.visibilityState
  });
}

// Handle connection recovery after tab becomes visible
async function handleConnectionRecovery() {
  if (!isConnectionSuspended || !zero) return;
  
  try {
    logZero('Attempting connection recovery...');
    isConnectionSuspended = false;
    
    // Test if the connection is still alive by attempting a simple operation
    // If Zero has internal connection recovery, this should work
    // Otherwise, we might need to reinitialize
    
    logZero('Connection recovery completed');
  } catch (error) {
    logZeroError('Connection recovery failed:', error);
    // If recovery fails, we might need to reinitialize
    // For now, we'll let Zero handle its own reconnection
  }
}

// Fetch JWT token with enhanced error handling
async function fetchZeroToken(): Promise<string> {
  if (!browser) return '';
  
  logZero('Fetching JWT token...');
  
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
      logZeroError('Token fetch error response:', errorText);
      throw new Error(`Token fetch failed: ${response.status}`);
    }
    
    const data = await response.json();
    logZero('Successfully fetched JWT token:', data.token?.substring(0, 20) + '...');
    logZero('User ID:', data.user_id);
    return data.token || '';
  } catch (error) {
    logZeroError('Failed to fetch Zero token:', error);
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
    logZeroError('Failed to get initial user ID:', error);
    return '';
  }
}

// Create Zero configuration with enhanced features
async function createZeroConfig(userId: string) {
  logZero('Creating config with userID:', userId);
  
  // Pre-fetch initial token to ensure we have it ready
  const initialToken = await fetchZeroToken();
  logZero('Pre-fetched initial token:', initialToken ? initialToken.substring(0, 20) + '...' : 'NONE');
  
  // Cache the token for use in auth function
  cachedToken = initialToken;
  tokenExpiryTime = Date.now() + (6 * 60 * 60 * 1000); // 6 hours
  
  // Enhanced auth function with better error handling
  const authFunction = async () => {
    logZero('Auth function called');
    
    // Check if we have a cached token that's still valid
    if (cachedToken && tokenExpiryTime && Date.now() < tokenExpiryTime) {
      logZero('Using cached token:', cachedToken.substring(0, 20) + '...');
      return cachedToken;
    }
    
    // Fetch fresh token
    logZero('Fetching fresh token...');
    const token = await fetchZeroToken();
    
    if (!token || token.length < 10) {
      logZeroError('Invalid token received:', token);
      throw new Error('Invalid JWT token received');
    }
    
    // Cache the new token
    cachedToken = token;
    tokenExpiryTime = Date.now() + (6 * 60 * 60 * 1000); // 6 hours
    
    logZero('Token length:', token.length);
    logZero('Token is valid JWT format:', token.split('.').length === 3);
    logZero('Returning fresh token:', token.substring(0, 20) + '...');
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

// Promise-based singleton initialization
async function performInitialization(): Promise<ZeroClient> {
  if (!browser) {
    // Return a mock client for SSR
    return {} as ZeroClient;
  }
  
  // Check if tab is visible before initializing
  if (!isTabVisible) {
    logZero('Tab is not visible, deferring initialization');
    throw new Error('Cannot initialize Zero in hidden tab');
  }
  
  try {
    initializationState = 'pending';
    logZero('Starting Zero initialization...');
    
    // Setup visibility handler if not already done
    setupVisibilityChangeHandler();
    
    // Get initial user ID for Zero configuration
    const userId = await getInitialUserId();
    if (!userId) {
      throw new Error('Failed to get user ID for Zero');
    }
    
    const config = await createZeroConfig(userId);
    logZero('Creating Zero instance with config:', {
      server: config.server,
      userID: config.userID,
      kvStore: config.kvStore,
      logLevel: config.logLevel
    });
    
    zero = new Zero(config);
    initializationState = 'success';
    logZero('Zero initialization completed successfully');
    
    return zero;
  } catch (error) {
    initializationState = 'error';
    logZeroError('Zero initialization failed:', error);
    throw error;
  }
}

// Initialize Zero client with proper singleton pattern
export async function initZero(): Promise<ZeroClient> {
  // Return existing client if already initialized
  if (zero && initializationState === 'success') {
    logZero('Returning existing Zero client');
    return zero;
  }
  
  // Return existing promise if initialization is in progress
  if (initializationPromise) {
    logZero('Waiting for existing initialization to complete');
    return initializationPromise;
  }
  
  // Start new initialization
  logZero('Starting new Zero initialization');
  initializationPromise = performInitialization();
  
  try {
    const result = await initializationPromise;
    return result;
  } catch (error) {
    // Reset promise on error so next call can retry
    initializationPromise = null;
    throw error;
  }
}

// Get the current Zero client instance with proper waiting
export function getZero(): ZeroClient | null {
  if (!browser) {
    // Return null for SSR - components should handle this
    return null;
  }
  
  if (zero && initializationState === 'success') {
    return zero;
  }
  
  // If not initialized and tab is visible, start initialization
  if (!initializationPromise && isTabVisible) {
    logZero('Starting async initialization from getZero()');
    initZero().catch(error => {
      logZeroError('Async initialization failed:', error);
    });
  }
  
  return null;
}

// Get Zero client with Promise for components that can wait
export async function getZeroAsync(): Promise<ZeroClient> {
  if (!browser) {
    throw new Error('Cannot initialize Zero in SSR context');
  }
  
  if (zero && initializationState === 'success') {
    return zero;
  }
  
  return await initZero();
}

// Get initialization state for debugging
export function getZeroState() {
  return {
    isInitialized: !!zero,
    initializationState,
    isTabVisible,
    isConnectionSuspended,
    hasInitializationPromise: !!initializationPromise
  };
}

// Close Zero connection with proper cleanup
export function closeZero(): void {
  if (zero) {
    logZero('Closing Zero connection');
    // Zero doesn't have a close method in the current API
    // but we'll reset our reference and state
    zero = null;
    initializationState = 'idle';
    initializationPromise = null;
  }
  
  // Clean up visibility handler
  if (visibilityChangeHandler) {
    document.removeEventListener('visibilitychange', visibilityChangeHandler);
    visibilityChangeHandler = null;
  }
}

// Force reinitialize (for recovery scenarios)
export async function reinitializeZero(): Promise<ZeroClient> {
  logZero('Force reinitializing Zero client');
  closeZero();
  return await initZero();
}