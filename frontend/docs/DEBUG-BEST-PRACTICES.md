# Debug System Best Practices

## Overview

This document outlines best practices for using the Epic 014 debug system effectively, securely, and performantly.

## 🎯 Core Principles

### 1. Security First
- **Automatic Redaction**: All debug functions automatically redact sensitive data
- **Production Safety**: Debug calls are stripped from production builds
- **Data Validation**: Never bypass the security redactor

### 2. Performance Conscious
- **Conditional Execution**: Debug calls only execute when namespace is enabled
- **Lazy Evaluation**: Expensive operations should be guarded
- **Zero Production Cost**: No runtime overhead in production

### 3. Meaningful Context
- **Structured Data**: Use objects with descriptive keys
- **Consistent Patterns**: Follow established naming conventions
- **Rich Information**: Provide enough context for effective debugging

## 📝 Debug Call Patterns

### Excellent Debug Calls ✅

```typescript
import { debugAPI, debugState, debugPerformance } from '$lib/utils/debug';

// ✅ Rich context with structured data
debugAPI('User authentication request', {
  endpoint: '/api/auth/login',
  method: 'POST',
  timestamp: new Date().toISOString(),
  userAgent: navigator.userAgent.substring(0, 50),
  referrer: document.referrer
});

// ✅ State changes with before/after comparison
debugState('Job status updated', {
  jobId: job.id,
  previousStatus: oldStatus,
  newStatus: newStatus,
  updatedBy: currentUser.id,
  reason: updateReason,
  timestamp: Date.now()
});

// ✅ Performance monitoring with metrics
const start = performance.now();
// ... operation ...
debugPerformance('Database query completed', {
  query: 'SELECT * FROM jobs WHERE status = ?',
  parameters: ['active'],
  duration: `${(performance.now() - start).toFixed(2)}ms`,
  rowCount: results.length,
  cacheHit: false
});
```

### Poor Debug Calls ❌

```typescript
// ❌ String concatenation instead of structured data
debugAPI('User ' + user.name + ' logged in at ' + Date.now());

// ❌ Vague, non-descriptive messages
debugState('Something changed', data);

// ❌ Missing context
debugError('Error occurred');

// ❌ Sensitive data exposure (though it would be auto-redacted)
debugAPI('Raw response', { password: 'secret123' }); // Auto-redacted, but shows poor intent
```

## 🏗️ Architecture Patterns

### Component Lifecycle Debugging

```typescript
import { debugComponent, debugState } from '$lib/utils/debug';

export class MyComponent {
  constructor() {
    debugComponent('Component instantiated', {
      componentName: 'MyComponent',
      timestamp: Date.now(),
      props: this.props
    });
  }
  
  onMount() {
    debugComponent('Component mounted', {
      componentName: 'MyComponent',
      renderTime: this.getRenderTime(),
      domNodes: this.getDomNodeCount()
    });
  }
  
  onDestroy() {
    debugComponent('Component destroyed', {
      componentName: 'MyComponent',
      lifetime: Date.now() - this.createdAt,
      cleanupActions: this.getCleanupCount()
    });
  }
}
```

### API Request Lifecycle

```typescript
import { debugAPI, debugError, debugPerformance } from '$lib/utils/debug';

class ApiClient {
  async request(endpoint: string, options: RequestInit) {
    const requestId = this.generateRequestId();
    const start = performance.now();
    
    debugAPI('API request initiated', {
      requestId,
      endpoint,
      method: options.method || 'GET',
      headers: this.sanitizeHeaders(options.headers),
      timestamp: new Date().toISOString()
    });
    
    try {
      const response = await fetch(endpoint, options);
      const duration = performance.now() - start;
      
      debugAPI('API response received', {
        requestId,
        endpoint,
        status: response.status,
        statusText: response.statusText,
        duration: `${duration.toFixed(2)}ms`,
        responseSize: response.headers.get('content-length')
      });
      
      debugPerformance('API request completed', {
        endpoint,
        duration: `${duration.toFixed(2)}ms`,
        status: response.status,
        cacheStatus: response.headers.get('x-cache') || 'unknown'
      });
      
      return response;
    } catch (error) {
      debugError('API request failed', {
        requestId,
        endpoint,
        error: error.message,
        duration: `${(performance.now() - start).toFixed(2)}ms`,
        stack: error.stack?.substring(0, 500)
      });
      throw error;
    }
  }
}
```

### State Management Debugging

```typescript
import { debugState, debugReactive } from '$lib/utils/debug';

class JobStore {
  private state = $state({
    jobs: [],
    loading: false,
    error: null,
    lastUpdated: null
  });
  
  // Debug reactive computations
  get activeJobs() {
    debugReactive('Computing active jobs', {
      totalJobs: this.state.jobs.length,
      timestamp: Date.now()
    });
    
    return this.state.jobs.filter(job => job.status === 'active');
  }
  
  // Debug state mutations
  updateJob(jobId: string, updates: Partial<Job>) {
    const oldJob = this.state.jobs.find(j => j.id === jobId);
    
    debugState('Job update initiated', {
      jobId,
      currentState: oldJob ? { ...oldJob } : null,
      updates,
      timestamp: Date.now()
    });
    
    const jobIndex = this.state.jobs.findIndex(j => j.id === jobId);
    if (jobIndex !== -1) {
      const newJob = { ...this.state.jobs[jobIndex], ...updates };
      this.state.jobs[jobIndex] = newJob;
      this.state.lastUpdated = Date.now();
      
      debugState('Job update completed', {
        jobId,
        previousState: oldJob,
        newState: newJob,
        fieldsChanged: Object.keys(updates)
      });
    } else {
      debugState('Job update failed - job not found', {
        jobId,
        availableJobIds: this.state.jobs.map(j => j.id)
      });
    }
  }
}
```

## 🔒 Security Best Practices

### Automatic Redaction Awareness

```typescript
import { debugAPI } from '$lib/utils/debug';

// The debug system automatically redacts these fields:
debugAPI('Authentication completed', {
  username: 'admin',           // ✅ Safe - preserved
  password: 'secret123',       // 🔒 Auto-redacted
  email: 'user@example.com',   // 🔒 Auto-redacted (configurable)
  csrf_token: 'abc123',        // 🔒 Auto-redacted
  authorization: 'Bearer xyz', // 🔒 Auto-redacted
  user_id: 12345,             // ✅ Safe - preserved
  session_id: 'sess_abc',     // 🔒 Auto-redacted
  api_key: 'key_123'          // 🔒 Auto-redacted
});
```

### Custom Sensitive Data

```typescript
import { securityRedactor } from '$lib/utils/debug';

// For data not automatically detected:
const customerData = {
  name: 'John Doe',
  ssn: '123-45-6789',        // Not auto-detected
  creditScore: 750,
  internalNotes: 'VIP customer'
};

// Manual redaction for custom fields
const safeData = {
  ...customerData,
  ssn: '[REDACTED]',         // Manual redaction
  internalNotes: '[INTERNAL]' // Manual redaction
};

debugAPI('Customer data processed', safeData);
```

### Production Safety Verification

```typescript
// This code demonstrates production safety
if (import.meta.env.PROD) {
  // In production, this call is completely stripped out
  debugAPI('This will not exist in production builds', {
    sensitiveData: 'Even if this contained secrets',
    expensiveComputation: heavyCalculation() // This won't execute in production
  });
}
```

## ⚡ Performance Best Practices

### Lazy Evaluation for Expensive Operations

```typescript
import { debugPerformance, isDebugEnabled } from '$lib/utils/debug';

function processLargeDataset(data: any[]) {
  // Only compute expensive debug info if debugging is enabled
  if (isDebugEnabled('bos:performance')) {
    const stats = calculateExpensiveStatistics(data);
    debugPerformance('Dataset processing started', {
      recordCount: data.length,
      memoryUsage: process.memoryUsage?.().heapUsed || 'unknown',
      statistics: stats
    });
  }
  
  // Main processing logic
  const result = data.map(processRecord);
  
  debugPerformance('Dataset processing completed', {
    inputCount: data.length,
    outputCount: result.length,
    processingTime: 'measured elsewhere'
  });
  
  return result;
}
```

### Conditional Debug Groups

```typescript
import { debugAPI, isDebugEnabled } from '$lib/utils/debug';

function apiRequestWithVerboseLogging(endpoint: string) {
  debugAPI('API request started', { endpoint });
  
  // Only do expensive logging if API debugging is enabled
  if (isDebugEnabled('bos:api')) {
    const detailedContext = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      connectionType: navigator.connection?.effectiveType,
      referrer: document.referrer,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      cookieCount: document.cookie.split(';').length
    };
    
    debugAPI('Detailed request context', detailedContext);
  }
  
  // Continue with actual request...
}
```

### Memory Efficient Debugging

```typescript
import { debugState } from '$lib/utils/debug';

class LargeDataStore {
  private data: LargeObject[] = [];
  
  addItem(item: LargeObject) {
    // Don't log entire large objects - use summaries
    debugState('Item added to store', {
      itemId: item.id,
      itemType: item.type,
      dataSize: JSON.stringify(item).length,
      totalItems: this.data.length + 1,
      memoryEstimate: `${(this.data.length * 1024)}KB` // Rough estimate
    });
    
    this.data.push(item);
  }
  
  // For debugging large datasets, use pagination
  debugDataSample(reason: string) {
    debugState(`Data sample: ${reason}`, {
      totalItems: this.data.length,
      sampleSize: Math.min(5, this.data.length),
      sample: this.data.slice(0, 5).map(item => ({
        id: item.id,
        type: item.type,
        size: JSON.stringify(item).length
      })),
      hasMore: this.data.length > 5
    });
  }
}
```

## 🧪 Testing Integration

### Debug-Aware Test Patterns

```typescript
import { test, expect } from '@playwright/test';
import { debugAPI } from '$lib/utils/debug';

test.describe('Debug-aware tests', () => {
  test.beforeEach(async ({ page }) => {
    // Enable debug output for test investigation
    await page.addInitScript(() => {
      localStorage.debug = 'bos:api,bos:auth';
    });
  });
  
  test('user authentication flow', async ({ page }) => {
    // Debug calls in tests should include test context
    debugAPI('Test: Starting authentication flow', {
      testName: 'user authentication flow',
      testFile: 'auth.spec.ts',
      browserName: test.info().project.name
    });
    
    await page.goto('/login');
    // ... test logic ...
  });
});
```

### Debug Output Validation

```typescript
import { vi, test, expect } from 'vitest';
import { debugAPI } from '$lib/utils/debug';

test('debug output validation', () => {
  // Spy on debug output
  const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  
  // Enable debugging for this test
  process.env.DEBUG = 'bos:api';
  
  // Make debug call
  debugAPI('Test debug call', { testData: 'value' });
  
  // Verify debug output format
  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringMatching(/bos:api.*Test debug call/)
  );
  
  // Verify sensitive data is redacted
  debugAPI('Sensitive test', { password: 'secret' });
  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining('[REDACTED]')
  );
  
  consoleSpy.mockRestore();
});
```

## 📊 Monitoring and Analytics

### Debug Metrics Collection

```typescript
import { debugPerformance } from '$lib/utils/debug';

class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  
  measure<T>(operation: string, fn: () => T): T {
    const start = performance.now();
    
    try {
      const result = fn();
      const duration = performance.now() - start;
      
      this.recordMetric(operation, duration);
      
      debugPerformance('Operation completed', {
        operation,
        duration: `${duration.toFixed(2)}ms`,
        averageTime: this.getAverage(operation),
        callCount: this.getCallCount(operation)
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      
      debugPerformance('Operation failed', {
        operation,
        duration: `${duration.toFixed(2)}ms`,
        error: error.message
      });
      
      throw error;
    }
  }
  
  private recordMetric(operation: string, duration: number) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    this.metrics.get(operation)!.push(duration);
  }
  
  private getAverage(operation: string): string {
    const times = this.metrics.get(operation) || [];
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    return `${avg.toFixed(2)}ms`;
  }
  
  private getCallCount(operation: string): number {
    return this.metrics.get(operation)?.length || 0;
  }
}
```

## 🎯 Namespace-Specific Guidelines

### Core System Namespaces

#### debugAPI
```typescript
// ✅ Include request/response details
debugAPI('GraphQL query executed', {
  query: query.replace(/\s+/g, ' ').trim(),
  variables: variables,
  operationName: operationName,
  cacheStatus: 'miss'
});

// ✅ Track API performance
debugAPI('API batch request completed', {
  requestCount: requests.length,
  successCount: successful.length,
  errorCount: failed.length,
  totalDuration: `${duration}ms`
});
```

#### debugAuth
```typescript
// ✅ Track authentication state changes
debugAuth('User session validated', {
  userId: user.id,
  roles: user.roles,
  sessionAge: Date.now() - session.createdAt,
  tokenExpiresIn: session.expiresAt - Date.now()
});

// ✅ Monitor auth security events
debugAuth('Suspicious login attempt detected', {
  attemptedUsername: username,
  sourceIP: request.ip,
  userAgent: request.headers['user-agent'],
  failureReason: 'multiple_recent_failures'
});
```

#### debugComponent
```typescript
// ✅ Track component performance
debugComponent('Heavy component rendered', {
  componentName: 'DataTable',
  rowCount: data.length,
  renderTime: `${renderDuration}ms`,
  reRenderReason: 'data_changed'
});
```

### Business Logic Namespaces

#### debugWorkflow
```typescript
// ✅ Track business process steps
debugWorkflow('Job workflow step completed', {
  jobId: job.id,
  currentStep: 'quality_review',
  nextStep: 'client_approval',
  stepDuration: duration,
  workflowProgress: '75%'
});
```

## 🚀 Advanced Patterns

### Contextual Debug Wrappers

```typescript
class DebugContext {
  constructor(private context: Record<string, any>) {}
  
  api(message: string, data?: any) {
    debugAPI(message, { ...this.context, ...data });
  }
  
  state(message: string, data?: any) {
    debugState(message, { ...this.context, ...data });
  }
  
  component(message: string, data?: any) {
    debugComponent(message, { ...this.context, ...data });
  }
}

// Usage
const ctx = new DebugContext({
  userId: currentUser.id,
  sessionId: session.id,
  feature: 'job-management'
});

ctx.api('Job data loaded', { jobCount: jobs.length });
ctx.state('Filter applied', { filter: selectedFilter });
```

### Debug Middleware Pattern

```typescript
function withDebugContext<T extends (...args: any[]) => any>(
  fn: T,
  namespace: string,
  context: Record<string, any>
): T {
  return ((...args: any[]) => {
    const debugFn = getDebugFunction(namespace);
    
    debugFn('Function called', {
      functionName: fn.name,
      arguments: args.length,
      context
    });
    
    try {
      const result = fn(...args);
      
      debugFn('Function completed', {
        functionName: fn.name,
        resultType: typeof result,
        context
      });
      
      return result;
    } catch (error) {
      debugFn('Function failed', {
        functionName: fn.name,
        error: error.message,
        context
      });
      throw error;
    }
  }) as T;
}
```

## 📋 Debug Review Checklist

Before committing debug calls:

- [ ] ✅ Appropriate namespace selected
- [ ] ✅ Structured data with meaningful keys
- [ ] ✅ No sensitive data exposed (relies on auto-redaction)
- [ ] ✅ Performance impact considered
- [ ] ✅ Consistent with existing patterns
- [ ] ✅ Provides useful debugging context
- [ ] ✅ Test-friendly format when applicable

---

**Best Practices Status**: ✅ Comprehensive guide complete
**Security**: ✅ Auto-redaction guidelines included
**Performance**: ✅ Optimization patterns documented
**Testing**: ✅ Integration strategies outlined