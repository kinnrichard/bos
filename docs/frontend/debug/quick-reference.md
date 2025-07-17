---
title: "Debug System Quick Reference"
description: "Quick reference guide for the Epic 014 debug system namespaces and usage"
last_updated: "2025-07-17"
status: "active"
category: "reference"
tags: ["debug", "quick-reference", "epic-014", "namespaces", "usage"]
---

# Debug System Quick Reference

## 🚀 Enable Debugging

```bash
# Enable all (19 namespaces)
DEBUG=bos:* npm run dev

# Browser console
bosDebug.enable('bos:*')
```

## 📦 Import Debug Functions

```typescript
// Core system
import { debugAPI, debugAuth, debugSecurity } from '$lib/utils/debug';

// Performance
import { debugPerformance, debugError } from '$lib/utils/debug';

// Business logic
import { debugWorkflow, debugSearch } from '$lib/utils/debug';
```

## 🎯 Usage Patterns

```typescript
// API calls (secure)
debugAPI('User fetched', { userId: 123, responseTime: '45ms' });

// Component state
debugState('Job updated', { jobId, oldStatus, newStatus });

// Performance monitoring
debugPerformance('Query completed', { duration: '120ms', rows: 50 });

// Error handling
debugError('API failed', { error: error.message, endpoint });
```

## 🛡️ Security Features

✅ **Auto-redacted**: `password`, `token`, `authorization`, `api_key`
✅ **Production safe**: Zero runtime cost
✅ **Type safe**: Full TypeScript support

## 📋 All 19 Namespaces

**Core (7)**: `api`, `auth`, `security`, `reactive`, `state`, `component`, `cache`
**Data (3)**: `database`, `websocket`, `validation`  
**Monitor (2)**: `performance`, `error`
**UI (2)**: `navigation`, `notification`
**Business (5)**: `workflow`, `search`, `upload`, `export`, `integration`

## 🎛️ Browser Commands

```javascript
bosDebug.list()      // Show all namespaces
bosDebug.status()    // Check current settings  
bosDebug.enable('bos:api,bos:auth')  // Enable specific
bosDebug.disable()   // Turn off debugging
```

---
📚 **Full docs**: `/docs/EPIC-014-DEBUG-SYSTEM-GUIDE.md`