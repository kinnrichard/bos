/**
 * Debug System - Main Entry Point
 * 
 * This module provides a comprehensive, secure debug logging system with:
 * - Automatic security redaction of sensitive data
 * - Namespace-based debug control
 * - Browser development helpers
 * - TypeScript support
 * 
 * Usage Examples:
 * 
 * Enable all debugging:
 * DEBUG=bos:* npm run dev
 * 
 * Enable specific namespaces:
 * DEBUG=bos:api,bos:auth npm run dev
 * 
 * Enable all except cache debugging:
 * DEBUG=bos:*,-bos:cache npm run dev
 * 
 * In browser console (localStorage):
 * localStorage.debug = 'bos:*'
 * // Then refresh the page
 * 
 * Security Features:
 * - All debug functions automatically redact sensitive data
 * - Passwords, tokens, CSRF headers, and auth data are filtered
 * - Safe to use in production environments with debug enabled
 */

// Re-export all public APIs
export * from './namespaces';
export * from './core';
export * from './browser';
export { createSecurityRedactor, securityRedactor } from './redactor';

// Initialize browser helpers
import { initializeBrowserDebugHelpers } from './browser';
initializeBrowserDebugHelpers();

// Export default for convenience
export { debugAPI as default } from './namespaces';