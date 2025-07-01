import debug from 'debug';

// Create namespaced debug functions for different areas of the application
// These will only log when the corresponding DEBUG environment variable is set

// Technician assignment debugging - for TechnicianAssignmentButton component
export const debugTechAssignment = debug('bos:technician-assignment');

// Reactive statement debugging - for Svelte reactive statement issues
export const debugReactive = debug('bos:reactive');

// API operation debugging - for API calls and responses
export const debugAPI = debug('bos:api');

// State management debugging - for component state changes
export const debugState = debug('bos:state');

// General component debugging
export const debugComponent = debug('bos:component');

// Cache and data synchronization debugging
export const debugCache = debug('bos:cache');

/**
 * Usage examples:
 * 
 * Enable all bos debugging:
 * DEBUG=bos:* npm run dev
 * 
 * Enable only technician assignment debugging:
 * DEBUG=bos:technician-assignment npm run dev
 * 
 * Enable multiple specific namespaces:
 * DEBUG=bos:technician-assignment,bos:api npm run dev
 * 
 * Enable all except cache debugging:
 * DEBUG=bos:*,-bos:cache npm run dev
 * 
 * In browser console (localStorage):
 * localStorage.debug = 'bos:*'
 * // Then refresh the page
 */

// Development helper - expose debug control in browser console during development
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  // @ts-ignore - Development only
  window.bosDebug = {
    enable: (namespaces: string) => {
      localStorage.debug = namespaces;
      console.log(`Debug enabled for: ${namespaces}`);
      console.log('Refresh the page to see debug output');
    },
    disable: () => {
      localStorage.removeItem('debug');
      console.log('Debug disabled. Refresh the page.');
    },
    status: () => {
      const current = localStorage.debug;
      console.log(current ? `Debug enabled: ${current}` : 'Debug disabled');
    }
  };
  
  console.log('🐛 Debug helper available: window.bosDebug');
  console.log('   bosDebug.enable("bos:*") - Enable all debugging');
  console.log('   bosDebug.enable("bos:technician-assignment") - Enable specific namespace');
  console.log('   bosDebug.disable() - Disable all debugging');
  console.log('   bosDebug.status() - Check current debug settings');
}