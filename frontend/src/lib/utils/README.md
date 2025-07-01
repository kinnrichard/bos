# Debugging System

This project uses the [`debug`](https://github.com/debug-js/debug) library for professional, toggleable debugging.

## Quick Start

### Enable All Debugging
```bash
npm run dev
# or
DEBUG=bos:* npm run dev:quiet
```

### Enable Specific Areas
```bash
# Only technician assignment debugging
DEBUG=bos:technician-assignment npm run dev:quiet

# Only API calls
DEBUG=bos:api npm run dev:quiet

# Multiple areas
DEBUG=bos:technician-assignment,bos:api npm run dev:quiet
```

### Disable Debugging
```bash
npm run dev:quiet
```

## Browser Console Control

In development, you can control debugging from the browser console:

```javascript
// Enable all debugging
bosDebug.enable('bos:*')

// Enable specific namespace
bosDebug.enable('bos:technician-assignment')

// Disable debugging
bosDebug.disable()

// Check current settings
bosDebug.status()
```

After changing settings, refresh the page to see the changes.

## Available Debug Namespaces

- `bos:technician-assignment` - Technician assignment operations
- `bos:reactive` - Svelte reactive statement debugging  
- `bos:api` - API calls and responses
- `bos:state` - Component state changes
- `bos:component` - General component debugging
- `bos:cache` - Cache and data synchronization

## Advanced Patterns

```bash
# Enable everything except cache debugging
DEBUG=bos:*,-bos:cache npm run dev:quiet

# Enable only error-level debugging in production-like testing
DEBUG=bos:*:error npm run dev:quiet

# Multiple patterns
DEBUG=bos:api,bos:state npm run dev:quiet
```

## Adding New Debug Calls

```typescript
import { debugTechAssignment, debugAPI } from '$lib/utils/debug';

// Use appropriate formatter
debugAPI('User response: %o', userObject);     // %o for objects
debugAPI('Count: %d', 42);                    // %d for numbers  
debugAPI('Name: %s', 'John');                 // %s for strings
debugAPI('JSON: %j', { key: 'value' });       // %j for JSON

// The debug calls will only execute when the namespace is enabled
// Zero performance impact when disabled
```

## Production Builds

Debug calls are automatically stripped from production builds via dead code elimination, ensuring zero runtime overhead.