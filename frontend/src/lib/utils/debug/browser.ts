import { getEnabledNamespaces } from './core';

/**
 * Browser-specific debug helpers module
 * Provides development tools and browser console integration
 */

/**
 * Browser debug helper interface
 */
interface BrowserDebugHelper {
  enable: (namespaces: string) => void;
  disable: () => void;
  status: () => void;
  list: () => void;
}

/**
 * Create browser debug helper functions
 */
function createBrowserDebugHelper(): BrowserDebugHelper {
  return {
    enable: (namespaces: string) => {
      localStorage.debug = namespaces;
      console.log(`🐛 Debug enabled for: ${namespaces}`);
      console.log('🔄 Refresh the page to see debug output');
      console.log('💡 Enhanced features: All debug functions now have .warn() and .error() methods');
      console.log('   Example: debugAPI.warn("message", data) or debugAPI.error("message", data)');
    },
    
    disable: () => {
      localStorage.removeItem('debug');
      console.log('🐛 Debug disabled. Refresh the page.');
    },
    
    status: () => {
      const current = localStorage.debug;
      if (current) {
        console.log(`🐛 Debug enabled: ${current}`);
        const enabled = getEnabledNamespaces();
        if (enabled.length > 0) {
          console.log('🎯 Active namespaces:', enabled);
        }
      } else {
        console.log('🐛 Debug disabled');
      }
    },
    
    list: () => {
      console.log('🐛 Available debug namespaces (19 total) - Enhanced with .warn/.error methods:');
      console.log('');
      console.log('📦 Core System:');
      console.log('   bos:api - API requests and responses (secure)');
      console.log('   bos:auth - Authentication operations (secure)');
      console.log('   bos:security - Security-related operations (secure)');
      console.log('   bos:reactive - Svelte reactive statements');
      console.log('   bos:state - Component state changes');
      console.log('   bos:component - General component debugging');
      console.log('   bos:cache - Cache and data synchronization');
      console.log('');
      console.log('💾 Data & Persistence:');
      console.log('   bos:database - Database queries and transactions (secure)');
      console.log('   bos:websocket - WebSocket communication (secure)');
      console.log('   bos:validation - Form and data validation');
      console.log('');
      console.log('⚡ Performance & Monitoring:');
      console.log('   bos:performance - Performance metrics and timing');
      console.log('   bos:error - Error handling and recovery');
      console.log('');
      console.log('🎨 User Interface:');
      console.log('   bos:navigation - Routing and page transitions');
      console.log('   bos:notification - Alerts and messages');
      console.log('');
      console.log('🏢 Business Logic:');
      console.log('   bos:workflow - Business process flows');
      console.log('   bos:search - Search operations');
      console.log('   bos:upload - File upload operations (secure)');
      console.log('   bos:export - Data export operations');
      console.log('   bos:integration - Third-party integrations (secure)');
      console.log('');
      console.log('💡 Basic Examples:');
      console.log('   bosDebug.enable("bos:*") - Enable all debugging');
      console.log('   bosDebug.enable("bos:api,bos:auth") - Enable specific namespaces');
      console.log('   bosDebug.enable("bos:*,-bos:cache") - Enable all except cache');
      console.log('');
      console.log('🎯 Level-based Controls (NEW):');
      console.log('   bosDebug.enable("bos:api:warn") - Enable API warnings only');
      console.log('   bosDebug.enable("bos:*:error") - Enable all error levels');
      console.log('   bosDebug.enable("bos:auth:*") - Enable auth at all levels');
      console.log('');
      console.log('🔧 Enhanced Usage:');
      console.log('   debugAPI("info message", data) - Info level');
      console.log('   debugAPI.warn("warning message", data) - Warning level');
      console.log('   debugAPI.error("error message", data) - Error level');
    }
  };
}

/**
 * Initialize browser debug helpers in development mode
 */
export function initializeBrowserDebugHelpers(): void {
  // Only initialize in browser environment and development mode
  if (typeof window === 'undefined' || !import.meta.env.DEV) {
    return;
  }

  // Create and expose debug helper
  const debugHelper = createBrowserDebugHelper();
  
  // @ts-ignore - Development only
  window.bosDebug = debugHelper;
  
  // Show available commands
  console.log('🐛 Debug helper available: window.bosDebug (Enhanced with .warn/.error methods)');
  console.log('   bosDebug.enable("bos:*") - Enable all debugging (19 namespaces)');
  console.log('   bosDebug.enable("bos:api") - Enable API debugging (secure)');
  console.log('   bosDebug.enable("bos:auth") - Enable auth debugging (secure)');
  console.log('   bosDebug.enable("bos:security") - Enable security debugging (secure)');
  console.log('   bosDebug.enable("bos:*:warn") - Enable all warning levels');
  console.log('   bosDebug.enable("bos:*:error") - Enable all error levels');
  console.log('   bosDebug.disable() - Disable all debugging');
  console.log('   bosDebug.status() - Check current debug settings');
  console.log('   bosDebug.list() - Show all available namespaces');
}

/**
 * Get debug status for display in UI
 */
export function getDebugStatus(): {
  enabled: boolean;
  namespaces: string[];
  current: string | null;
} {
  const current = typeof localStorage !== 'undefined' ? localStorage.debug : null;
  const enabled = !!current;
  const namespaces = enabled ? getEnabledNamespaces() : [];
  
  return {
    enabled,
    namespaces,
    current
  };
}

/**
 * Check if we're in a browser environment
 */
export function isBrowserEnvironment(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Check if we're in development mode
 */
export function isDevelopmentMode(): boolean {
  return import.meta.env.DEV;
}