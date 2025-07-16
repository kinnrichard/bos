import { createSecureDebugger } from './core';

/**
 * Debug namespace definitions module
 * Provides pre-configured debug functions for different areas of the application
 */

/**
 * Debug namespace constants
 */
export const DEBUG_NAMESPACES = {
  API: 'bos:api',
  AUTH: 'bos:auth',
  SECURITY: 'bos:security',
  REACTIVE: 'bos:reactive',
  STATE: 'bos:state',
  COMPONENT: 'bos:component',
  CACHE: 'bos:cache',
  TECHNICIAN_ASSIGNMENT: 'bos:technician-assignment'
} as const;

/**
 * API operation debugging - for API calls and responses (secure)
 * Usage: debugAPI('Making request', { url, method, headers })
 */
export const debugAPI = createSecureDebugger(DEBUG_NAMESPACES.API);

/**
 * Authentication debugging - for auth-related operations (secure)
 * Usage: debugAuth('User login attempt', { userId, timestamp })
 */
export const debugAuth = createSecureDebugger(DEBUG_NAMESPACES.AUTH);

/**
 * Security debugging - for security-related operations (secure)
 * Usage: debugSecurity('CSRF token validation', { result, timestamp })
 */
export const debugSecurity = createSecureDebugger(DEBUG_NAMESPACES.SECURITY);

/**
 * Reactive statement debugging - for Svelte reactive statement issues
 * Usage: debugReactive('Store updated', { storeName, newValue })
 */
export const debugReactive = createSecureDebugger(DEBUG_NAMESPACES.REACTIVE);

/**
 * State management debugging - for component state changes
 * Usage: debugState('Component state changed', { component, oldState, newState })
 */
export const debugState = createSecureDebugger(DEBUG_NAMESPACES.STATE);

/**
 * General component debugging
 * Usage: debugComponent('Component mounted', { componentName, props })
 */
export const debugComponent = createSecureDebugger(DEBUG_NAMESPACES.COMPONENT);

/**
 * Cache and data synchronization debugging
 * Usage: debugCache('Cache hit', { key, value })
 */
export const debugCache = createSecureDebugger(DEBUG_NAMESPACES.CACHE);

/**
 * Technician assignment debugging - for TechnicianAssignmentButton component
 * Usage: debugTechAssignment('Assignment status changed', { technicianId, status })
 */
export const debugTechAssignment = createSecureDebugger(DEBUG_NAMESPACES.TECHNICIAN_ASSIGNMENT);

/**
 * All debug functions in a convenient object
 */
export const debugFunctions = {
  debugAPI,
  debugAuth,
  debugSecurity,
  debugReactive,
  debugState,
  debugComponent,
  debugCache,
  debugTechAssignment
} as const;

/**
 * Array of all debug namespace strings
 */
export const ALL_DEBUG_NAMESPACES = Object.values(DEBUG_NAMESPACES);