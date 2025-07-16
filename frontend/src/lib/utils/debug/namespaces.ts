import { createSecureDebugger } from './core';

/**
 * Debug namespace definitions module
 * Provides pre-configured debug functions for different areas of the application
 */

/**
 * Debug namespace constants
 * Expanded to 19 namespaces for comprehensive system coverage
 */
export const DEBUG_NAMESPACES = {
  // Core system namespaces
  API: 'bos:api',
  AUTH: 'bos:auth',
  SECURITY: 'bos:security',
  REACTIVE: 'bos:reactive',
  STATE: 'bos:state',
  COMPONENT: 'bos:component',
  CACHE: 'bos:cache',
  
  // Data and persistence namespaces
  DATABASE: 'bos:database',
  WEBSOCKET: 'bos:websocket',
  VALIDATION: 'bos:validation',
  
  // Performance and monitoring namespaces
  PERFORMANCE: 'bos:performance',
  ERROR: 'bos:error',
  
  // User interface namespaces
  NAVIGATION: 'bos:navigation',
  NOTIFICATION: 'bos:notification',
  
  // Business logic namespaces
  WORKFLOW: 'bos:workflow',
  SEARCH: 'bos:search',
  UPLOAD: 'bos:upload',
  EXPORT: 'bos:export',
  INTEGRATION: 'bos:integration'
} as const;

// =============================================================================
// CORE SYSTEM DEBUG FUNCTIONS
// =============================================================================

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

// =============================================================================
// DATA AND PERSISTENCE DEBUG FUNCTIONS
// =============================================================================

/**
 * Database operation debugging - for database queries and transactions (secure)
 * Usage: debugDatabase('Query executed', { sql, params, duration })
 */
export const debugDatabase = createSecureDebugger(DEBUG_NAMESPACES.DATABASE);

/**
 * WebSocket communication debugging - for real-time connections (secure)
 * Usage: debugWebSocket('Message received', { type, payload, timestamp })
 */
export const debugWebSocket = createSecureDebugger(DEBUG_NAMESPACES.WEBSOCKET);

/**
 * Validation debugging - for form and data validation
 * Usage: debugValidation('Field validation failed', { field, error, value })
 */
export const debugValidation = createSecureDebugger(DEBUG_NAMESPACES.VALIDATION);

// =============================================================================
// PERFORMANCE AND MONITORING DEBUG FUNCTIONS
// =============================================================================

/**
 * Performance monitoring debugging - for timing and metrics
 * Usage: debugPerformance('Render completed', { component, duration, metrics })
 */
export const debugPerformance = createSecureDebugger(DEBUG_NAMESPACES.PERFORMANCE);

/**
 * Error handling debugging - for error tracking and recovery
 * Usage: debugError('Error handled', { error, context, recovery })
 */
export const debugError = createSecureDebugger(DEBUG_NAMESPACES.ERROR);

// =============================================================================
// USER INTERFACE DEBUG FUNCTIONS
// =============================================================================

/**
 * Navigation debugging - for routing and page transitions
 * Usage: debugNavigation('Route changed', { from, to, params })
 */
export const debugNavigation = createSecureDebugger(DEBUG_NAMESPACES.NAVIGATION);

/**
 * Notification system debugging - for alerts and messages
 * Usage: debugNotification('Notification shown', { type, message, duration })
 */
export const debugNotification = createSecureDebugger(DEBUG_NAMESPACES.NOTIFICATION);

// =============================================================================
// BUSINESS LOGIC DEBUG FUNCTIONS
// =============================================================================

/**
 * Workflow debugging - for business process flows
 * Usage: debugWorkflow('Step completed', { step, data, nextStep })
 */
export const debugWorkflow = createSecureDebugger(DEBUG_NAMESPACES.WORKFLOW);

/**
 * Search functionality debugging - for search operations
 * Usage: debugSearch('Search executed', { query, results, filters })
 */
export const debugSearch = createSecureDebugger(DEBUG_NAMESPACES.SEARCH);

/**
 * File upload debugging - for upload operations (secure)
 * Usage: debugUpload('File uploaded', { filename, size, type })
 */
export const debugUpload = createSecureDebugger(DEBUG_NAMESPACES.UPLOAD);

/**
 * Data export debugging - for export operations
 * Usage: debugExport('Export completed', { format, recordCount, duration })
 */
export const debugExport = createSecureDebugger(DEBUG_NAMESPACES.EXPORT);

/**
 * Integration debugging - for third-party integrations (secure)
 * Usage: debugIntegration('External API called', { service, endpoint, status })
 */
export const debugIntegration = createSecureDebugger(DEBUG_NAMESPACES.INTEGRATION);

/**
 * All debug functions in a convenient object
 * Organized by category for easy access
 */
export const debugFunctions = {
  // Core system functions
  debugAPI,
  debugAuth,
  debugSecurity,
  debugReactive,
  debugState,
  debugComponent,
  debugCache,
  
  // Data and persistence functions
  debugDatabase,
  debugWebSocket,
  debugValidation,
  
  // Performance and monitoring functions
  debugPerformance,
  debugError,
  
  // User interface functions
  debugNavigation,
  debugNotification,
  
  // Business logic functions
  debugWorkflow,
  debugSearch,
  debugUpload,
  debugExport,
  debugIntegration
} as const;

/**
 * Debug functions organized by category
 */
export const debugFunctionsByCategory = {
  core: {
    debugAPI,
    debugAuth,
    debugSecurity,
    debugReactive,
    debugState,
    debugComponent,
    debugCache
  },
  data: {
    debugDatabase,
    debugWebSocket,
    debugValidation
  },
  monitoring: {
    debugPerformance,
    debugError
  },
  ui: {
    debugNavigation,
    debugNotification
  },
  business: {
    debugWorkflow,
    debugSearch,
    debugUpload,
    debugExport,
    debugIntegration
  }
} as const;

/**
 * Array of all debug namespace strings
 */
export const ALL_DEBUG_NAMESPACES = Object.values(DEBUG_NAMESPACES);