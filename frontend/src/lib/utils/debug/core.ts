import debug from 'debug';
import { securityRedactor } from './redactor';

/**
 * Core debug functionality module
 * Provides secure debug logging with automatic data redaction
 */

/**
 * Secure debug function type
 */
export type SecureDebugFunction = (message: string, data?: any) => void;

/**
 * Create a secure debug function for a specific namespace
 * 
 * @param namespace - The debug namespace (e.g., 'bos:api')
 * @returns A secure debug function that automatically redacts sensitive data
 */
export function createSecureDebugger(namespace: string): SecureDebugFunction {
  const debugFn = debug(namespace);
  
  return function secureDebug(message: string, data?: any) {
    // Early return if debugging is not enabled for this namespace
    if (!debugFn.enabled) return;
    
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
  };
}

/**
 * Create multiple secure debug functions at once
 * 
 * @param namespaces - Array of namespace strings
 * @returns Object with debug functions keyed by namespace
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
 * Get all currently enabled debug namespaces
 * 
 * @returns Array of enabled namespace strings
 */
export function getEnabledNamespaces(): string[] {
  const enabledNamespaces: string[] = [];
  
  // Check common BOS namespaces
  const commonNamespaces = [
    'bos:api',
    'bos:auth',
    'bos:security',
    'bos:reactive',
    'bos:state',
    'bos:component',
    'bos:cache',
    'bos:technician-assignment'
  ];
  
  for (const namespace of commonNamespaces) {
    if (isDebugEnabled(namespace)) {
      enabledNamespaces.push(namespace);
    }
  }
  
  return enabledNamespaces;
}