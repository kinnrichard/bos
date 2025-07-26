# Epic 014: Debug System Standardization - Complete Developer Guide

## Overview

Epic 014 has successfully standardized the debug system across the entire application, expanding from 6 to 19 namespaces, migrating 306 console.log statements to secure debug functions, and removing the deprecated technician-assignment namespace. This guide provides comprehensive documentation for using the new debug system.

## 🎯 Epic 014 Achievements

- ✅ **19 Debug Namespaces** - Comprehensive coverage of all application areas
- ✅ **306 Console.log Migrations** - All logging statements converted to secure debug functions
- ✅ **Security Redaction** - Automatic sensitive data filtering
- ✅ **Technician-Assignment Namespace Removed** - Deprecated namespace eliminated
- ✅ **Browser Integration** - Development console helpers
- ✅ **TypeScript Support** - Full type safety and IntelliSense

## 🚀 Quick Start

### Enable All Debugging
```bash
# During development
DEBUG=bos:* npm run dev

# For specific components only
DEBUG=bos:api,bos:auth npm run dev
```

### Browser Console Control
```javascript
// Enable all debugging
bosDebug.enable('bos:*')

// Enable specific namespaces
bosDebug.enable('bos:api,bos:auth')

// Disable debugging
bosDebug.disable()

// Check status
bosDebug.status()

// List all namespaces
bosDebug.list()
```

## 📦 Debug Namespace Architecture

The debug system is organized into 5 categories with 19 total namespaces:

### Core System (7 namespaces)
- `bos:api` - API requests and responses (secure)
- `bos:auth` - Authentication operations (secure)
- `bos:security` - Security-related operations (secure)
- `bos:reactive` - Svelte reactive statements
- `bos:state` - Component state changes
- `bos:component` - General component debugging
- `bos:cache` - Cache and data synchronization

### Data & Persistence (3 namespaces)
- `bos:database` - Database queries and transactions (secure)
- `bos:websocket` - WebSocket communication (secure)
- `bos:validation` - Form and data validation

### Performance & Monitoring (2 namespaces)
- `bos:performance` - Performance metrics and timing
- `bos:error` - Error handling and recovery

### User Interface (2 namespaces)
- `bos:navigation` - Routing and page transitions
- `bos:notification` - Alerts and messages

### Business Logic (5 namespaces)
- `bos:workflow` - Business process flows
- `bos:search` - Search operations
- `bos:upload` - File upload operations (secure)
- `bos:export` - Data export operations
- `bos:integration` - Third-party integrations (secure)

## 🛡️ Security Features

### Automatic Data Redaction
All debug functions automatically redact sensitive information:

```typescript
import { debugAPI, debugAuth } from '$lib/utils/debug';

// These calls are automatically secured:
debugAPI('User login', { 
  username: 'admin', 
  password: 'secret123',  // Will be redacted as [REDACTED]
  csrf_token: 'abc123'    // Will be redacted as [REDACTED]
});

debugAuth('Auth response', {
  access_token: 'jwt_token',     // Will be redacted as [REDACTED]
  user: { id: 1, name: 'John' }, // User data preserved
  authorization: 'Bearer xyz'    // Will be redacted as [REDACTED]
});
```

### Redacted Fields
The security system automatically redacts:
- Passwords and auth tokens
- CSRF tokens and headers
- Authorization headers
- API keys and secrets
- Credit card numbers
- Email addresses (configurable)
- Any field containing 'password', 'token', 'secret', 'key'

## 🔧 Usage Examples

### API Debugging
```typescript
import { debugAPI } from '$lib/utils/debug';

async function fetchUser(id: number) {
  debugAPI('Fetching user', { id, endpoint: '/api/users' });
  
  try {
    const response = await fetch(`/api/users/${id}`);
    const user = await response.json();
    
    debugAPI('User fetched successfully', { 
      user: user,           // User data included
      responseTime: '150ms' 
    });
    
    return user;
  } catch (error) {
    debugAPI('User fetch failed', { id, error: error.message });
    throw error;
  }
}
```

### Component State Debugging
```typescript
import { debugState, debugComponent } from '$lib/utils/debug';

export class JobComponent {
  private state = $state({
    jobs: [],
    loading: false,
    error: null
  });
  
  onMount() {
    debugComponent('JobComponent mounted', { 
      initialState: this.state 
    });
  }
  
  async loadJobs() {
    debugState('Loading jobs started', { 
      previousCount: this.state.jobs.length 
    });
    
    this.state.loading = true;
    
    try {
      const jobs = await fetchJobs();
      this.state.jobs = jobs;
      this.state.loading = false;
      
      debugState('Jobs loaded successfully', { 
        jobCount: jobs.length,
        loadTime: performance.now() - start
      });
    } catch (error) {
      this.state.error = error;
      this.state.loading = false;
      
      debugState('Job loading failed', { 
        error: error.message 
      });
    }
  }
}
```

### Performance Monitoring
```typescript
import { debugPerformance } from '$lib/utils/debug';

function measureRenderTime(componentName: string) {
  const start = performance.now();
  
  return {
    end: () => {
      const duration = performance.now() - start;
      debugPerformance('Component render completed', {
        component: componentName,
        duration: `${duration.toFixed(2)}ms`,
        timestamp: new Date().toISOString()
      });
    }
  };
}

// Usage in component
const timer = measureRenderTime('JobList');
// ... component logic ...
timer.end();
```

### Error Handling
```typescript
import { debugError } from '$lib/utils/debug';

function handleApiError(error: Error, context: string) {
  debugError('API error occurred', {
    error: error.message,
    stack: error.stack,
    context: context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  });
  
  // Error recovery logic
  const recovery = attemptRecovery(error);
  
  debugError('Error recovery attempted', {
    originalError: error.message,
    recoveryAction: recovery.action,
    success: recovery.success
  });
}
```

## 🎛️ Development Tools

### Browser Debug Helper
When in development mode, a debug helper is automatically available:

```javascript
// Available in browser console
bosDebug.enable('bos:*')           // Enable all debugging
bosDebug.enable('bos:api')         // Enable API debugging only
bosDebug.enable('bos:api,bos:auth') // Enable multiple namespaces
bosDebug.disable()                 // Disable all debugging
bosDebug.status()                  // Show current settings
bosDebug.list()                    // Show all available namespaces
```

### Debug Status Component
For UI debugging, you can check debug status programmatically:

```typescript
import { getDebugStatus } from '$lib/utils/debug';

const status = getDebugStatus();
console.log('Debug enabled:', status.enabled);
console.log('Active namespaces:', status.namespaces);
console.log('Debug pattern:', status.current);
```

## 📋 Migration Patterns

### Before Epic 014 (Deprecated)
```typescript
// OLD - Manual console.log (AVOID)
console.log('User logged in:', user);
console.log('API response:', response);

// OLD - Technician assignment namespace (REMOVED)
import { debugTechAssignment } from '$lib/utils/debug';
debugTechAssignment('Assignment created', data); // ❌ Removed
```

### After Epic 014 (Current)
```typescript
// NEW - Secure debug functions
import { debugAuth, debugAPI } from '$lib/utils/debug';

debugAuth('User logged in', { user }); // ✅ Automatic redaction
debugAPI('API response', { response }); // ✅ Secure logging

// NEW - Use appropriate namespace
import { debugWorkflow } from '$lib/utils/debug';
debugWorkflow('Assignment created', data); // ✅ Correct namespace
```

## 🔍 Advanced Usage

### Category-Based Debugging
```typescript
// Import by category
import { debugFunctionsByCategory } from '$lib/utils/debug';

const { core, data, monitoring, ui, business } = debugFunctionsByCategory;

// Use category functions
core.debugAPI('API call', data);
data.debugDatabase('Query executed', query);
monitoring.debugPerformance('Render time', metrics);
```

### Custom Debug Patterns
```bash
# Enable all core system debugging
DEBUG=bos:api,bos:auth,bos:security,bos:reactive,bos:state,bos:component,bos:cache npm run dev

# Enable all except cache
DEBUG=bos:*,-bos:cache npm run dev

# Enable only business logic
DEBUG=bos:workflow,bos:search,bos:upload,bos:export,bos:integration npm run dev

# Performance debugging only
DEBUG=bos:performance,bos:error npm run dev
```

### Conditional Debugging
```typescript
import { isDebugEnabled } from '$lib/utils/debug';

// Check if debugging is enabled before expensive operations
if (isDebugEnabled('bos:performance')) {
  const metrics = calculateExpensiveMetrics();
  debugPerformance('Expensive calculation', metrics);
}
```

## 🧪 Testing Integration

### Debug in Tests
```typescript
import { test, expect } from '@playwright/test';
import { debugAPI } from '$lib/utils/debug';

test('API integration test', async ({ page }) => {
  // Enable debugging for this test
  await page.addInitScript(() => {
    localStorage.debug = 'bos:api';
  });
  
  // Debug calls will appear in browser console
  await page.goto('/api-test-page');
  
  // Test assertions...
});
```

### Production Safety
```typescript
// Debug calls are automatically stripped in production builds
debugAPI('Sensitive operation', { apiKey: 'secret' });
// This call has zero runtime cost in production
```

## 📊 Performance Impact

- **Development**: Minimal impact, only when debugging is enabled
- **Production**: Zero impact - all debug calls are stripped during build
- **Security**: Automatic redaction prevents data leaks
- **Bundle Size**: No increase in production bundle size

## 🛠️ Troubleshooting

### Debug Not Working?
1. Check if debugging is enabled: `bosDebug.status()`
2. Verify namespace pattern: `bosDebug.list()`
3. Refresh page after changing settings
4. Check browser console for error messages

### Missing Debug Output?
1. Ensure you're using the correct namespace
2. Check if the debug call is inside a conditional block
3. Verify environment variables in development

### Security Concerns?
1. All sensitive data is automatically redacted
2. Debug output is only visible in development
3. Production builds remove all debug code
4. Review `src/lib/utils/debug/redactor.ts` for redaction rules

## 📚 Reference

### All Available Debug Functions
```typescript
// Core system
debugAPI, debugAuth, debugSecurity, debugReactive, 
debugState, debugComponent, debugCache

// Data & persistence
debugDatabase, debugWebSocket, debugValidation

// Performance & monitoring
debugPerformance, debugError

// User interface
debugNavigation, debugNotification

// Business logic
debugWorkflow, debugSearch, debugUpload, debugExport, debugIntegration
```

### Import Patterns
```typescript
// Individual imports (recommended)
import { debugAPI, debugAuth } from '$lib/utils/debug';

// Category imports
import { debugFunctionsByCategory } from '$lib/utils/debug';

// All functions
import { debugFunctions } from '$lib/utils/debug';

// Default export (convenience)
import debug from '$lib/utils/debug'; // Returns debugAPI
```

---

## 🔗 Related Documentation

### Epic Documentation
- **[Epic-012: Secure Debug Architecture](../../docs/epics/completed/epic-012-secure-debug-architecture.md)** - Initial debug system implementation
- **[Epic-013: Tasklist Refactoring](../../docs/epics/completed/epic-013-tasklist-architectural-refactoring.md)** - Architectural improvements
- **[Epic-014: Debug System Standardization](../../docs/epics/completed/epic-014-debug-system-standardization.md)** - Debug system expansion
- **[Epic-015: Debug System Completion](../../docs/epics/completed/epic-015-debug-system-completion.md)** - Final implementation

### Debug System Documentation
- **[Debug Best Practices](./debug-best-practices.md)** - Development debugging patterns
- **[Debug Migration Guide](./debug-migration-guide.md)** - Migration from console.log to debug system
- **[Debug Quick Reference](./debug-quick-reference.md)** - Quick debug reference

### Architecture & Implementation
- **[Technical Decisions](../../docs/standards/technical-decisions.md)** - Architecture decision records
- **[Style Guide](../../docs/standards/style-guide.md)** - Code style and conventions
- **[Frontend Architecture](../../docs/architecture/frontend-architecture.md)** - Svelte + TypeScript patterns

### Development Workflow
- **[API Integration](../../docs/api/frontend-integration.md)** - Frontend API patterns
- **[Testing Strategy](../../docs/tests/readme-tests.md)** - Testing approach and patterns
- **[Claude Automation](../../docs/guides/claude-automation-setup.md)** - Automated development setup

### See Also
- **[Zero.js Integration](../src/lib/zero/README.md)** - Zero.js reactive system
- **[Frontend Migration Guide](../epic-008-migration-guide.md)** - Svelte 5 migration patterns
- **[Performance Guidelines](../../docs/architecture/performance-guidelines.md)** - Performance optimization

---

**Epic 014 Status**: ✅ Complete
**Debug Namespaces**: 19 implemented
**Console.log Migrations**: 306 completed
**Security**: Automatic redaction active
**Testing**: Integrated with Playwright and Vitest