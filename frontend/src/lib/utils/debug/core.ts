import debug from 'debug';
import { securityRedactor } from './redactor';

/**
 * Core debug functionality module
 * Provides secure debug logging with automatic data redaction
 */

/**
 * Enhanced debug function interface with multiple log levels
 */
export interface EnhancedDebugFunction {
  // Info level (existing functionality)
  (message: string, data?: any): void;
  
  // Warning level (new)
  warn(message: string, data?: any): void;
  
  // Error level (new)
  error(message: string, data?: any): void;
  
  // Properties
  enabled: boolean;
  namespace: string;
}

/**
 * Legacy secure debug function type (for backward compatibility)
 */
export type SecureDebugFunction = (message: string, data?: any) => void;

/**
 * Shared debug namespace class - eliminates code duplication
 */
class DebugNamespace {
  private infoFn: any;
  private warnFn: any;
  private errorFn: any;
  public namespace: string;

  constructor(namespace: string) {
    this.namespace = namespace;
    this.infoFn = debug(namespace);
    this.warnFn = debug(`${namespace}:warn`);
    this.errorFn = debug(`${namespace}:error`);
  }

  /**
   * Log info level message with security redaction
   */
  log = (message: string, data?: any): void => {
    if (!this.infoFn.enabled) return;
    this.secureLog(this.infoFn, message, data);
  };

  /**
   * Log warning level message with security redaction
   */
  warn = (message: string, data?: any): void => {
    if (!this.warnFn.enabled) return;
    this.secureLog(this.warnFn, `⚠️ ${message}`, data);
  };

  /**
   * Log error level message with security redaction
   */
  error = (message: string, data?: any): void => {
    if (!this.errorFn.enabled) return;
    this.secureLog(this.errorFn, `❌ ${message}`, data);
  };

  /**
   * Shared secure logging implementation
   */
  private secureLog(debugFn: any, message: string, data?: any): void {
    if (data) {
      try {
        // Redact sensitive data before logging
        const redactedData = securityRedactor(data);
        debugFn(message, redactedData);
      } catch (error) {
        // Fallback to basic logging if redaction fails
        debugFn(message, '[REDACTION_ERROR]');
        if (import.meta.env.DEV) {
          console.error('Debug redaction failed:', error);
        }
      }
    } else {
      debugFn(message);
    }
  }

  /**
   * Check if info level debugging is enabled
   */
  get enabled(): boolean {
    return this.infoFn.enabled;
  }
}

/**
 * Create enhanced debug function with multiple log levels (DRY implementation)
 * 
 * @param namespace - The debug namespace (e.g., 'bos:api')
 * @returns Enhanced debug function with .warn() and .error() methods
 */
export function createEnhancedDebugger(namespace: string): EnhancedDebugFunction {
  const debugNamespace = new DebugNamespace(namespace);
  
  // Create callable function that maintains current API
  const debugFn = (message: string, data?: any) => debugNamespace.log(message, data);
  
  // Add enhanced methods
  debugFn.warn = debugNamespace.warn;
  debugFn.error = debugNamespace.error;
  debugFn.enabled = debugNamespace.enabled;
  debugFn.namespace = namespace;
  
  return debugFn as EnhancedDebugFunction;
}

/**
 * Create a secure debug function for a specific namespace (legacy compatibility)
 * 
 * @param namespace - The debug namespace (e.g., 'bos:api')
 * @returns A secure debug function that automatically redacts sensitive data
 * @deprecated Use createEnhancedDebugger for new code
 */
export function createSecureDebugger(namespace: string): SecureDebugFunction {
  const enhanced = createEnhancedDebugger(namespace);
  return enhanced as SecureDebugFunction;
}

/**
 * Create multiple enhanced debug functions at once
 * 
 * @param namespaces - Array of namespace strings
 * @returns Object with enhanced debug functions keyed by namespace
 */
export function createEnhancedDebuggers(namespaces: string[]): Record<string, EnhancedDebugFunction> {
  const debuggers: Record<string, EnhancedDebugFunction> = {};
  
  for (const namespace of namespaces) {
    debuggers[namespace] = createEnhancedDebugger(namespace);
  }
  
  return debuggers;
}

/**
 * Create multiple secure debug functions at once (legacy compatibility)
 * 
 * @param namespaces - Array of namespace strings
 * @returns Object with debug functions keyed by namespace
 * @deprecated Use createEnhancedDebuggers for new code
 */
export function createSecureDebuggers(namespaces: string[]): Record<string, SecureDebugFunction> {
  const debuggers: Record<string, SecureDebugFunction> = {};
  
  for (const namespace of namespaces) {
    debuggers[namespace] = createSecureDebugger(namespace);
  }
  
  return debuggers;
}

/**
 * Check if debug is enabled for a specific namespace
 * 
 * @param namespace - The debug namespace to check
 * @returns True if debug is enabled for the namespace
 */
export function isDebugEnabled(namespace: string): boolean {
  return debug(namespace).enabled;
}

/**
 * Check if warning level debug is enabled for a specific namespace
 * 
 * @param namespace - The debug namespace to check
 * @returns True if warning debug is enabled for the namespace
 */
export function isWarningEnabled(namespace: string): boolean {
  return debug(`${namespace}:warn`).enabled;
}

/**
 * Check if error level debug is enabled for a specific namespace
 * 
 * @param namespace - The debug namespace to check
 * @returns True if error debug is enabled for the namespace
 */
export function isErrorEnabled(namespace: string): boolean {
  return debug(`${namespace}:error`).enabled;
}

/**
 * All debug namespaces (DRY constant)
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

/**
 * Get all currently enabled debug namespaces
 * 
 * @returns Array of enabled namespace strings
 */
export function getEnabledNamespaces(): string[] {
  const enabledNamespaces: string[] = [];
  
  // Check all BOS namespaces (DRY - using constant)
  const commonNamespaces = Object.values(DEBUG_NAMESPACES);
  
  for (const namespace of commonNamespaces) {
    if (isDebugEnabled(namespace)) {
      enabledNamespaces.push(namespace);
    }
  }
  
  return enabledNamespaces;
}