# Debugging Guide

## Overview

The bŏs project uses a professional debugging system based on the [`debug`](https://github.com/debug-js/debug) library, the same logging solution used by Express.js, Socket.io, and other major Node.js frameworks. This system provides zero-overhead, namespaced debugging that can be easily toggled on/off during development and is automatically stripped from production builds.

## Quick Start

### Enable All Debugging
```bash
npm run dev
# or explicitly:
DEBUG=bos:* npm run dev:quiet
```

### Enable Specific Areas
```bash
# Only technician assignment debugging
DEBUG=bos:technician-assignment npm run dev:quiet

# Only API calls
DEBUG=bos:api npm run dev:quiet

# Multiple specific areas
DEBUG=bos:technician-assignment,bos:api npm run dev:quiet
```

### Disable All Debugging
```bash
npm run dev:quiet
```

## Debug Namespaces

The project uses structured namespaces to organize debugging output:

| Namespace | Purpose | Example Usage |
|-----------|---------|---------------|
| `bos:technician-assignment` | Technician assignment operations | User selection, state changes, API calls |
| `bos:reactive` | Svelte reactive statement debugging | Reactive timing issues, prop syncing |
| `bos:api` | API calls and responses | Request/response logging, error tracking |
| `bos:state` | Component state changes | State updates, optimistic updates |
| `bos:component` | General component debugging | Lifecycle events, prop changes |
| `bos:cache` | Cache and data synchronization | Cache hits/misses, invalidation |

## Browser Console Controls

During development, you can control debugging from the browser console:

```javascript
// Enable all debugging
bosDebug.enable('bos:*')

// Enable specific namespace
bosDebug.enable('bos:technician-assignment')

// Enable multiple namespaces
bosDebug.enable('bos:technician-assignment,bos:api')

// Disable all debugging
bosDebug.disable()

// Check current debug settings
bosDebug.status()
```

**Note**: After changing browser settings, refresh the page to see changes.

## Advanced Debug Patterns

### Wildcard and Exclusion Patterns
```bash
# Enable everything except cache debugging
DEBUG=bos:*,-bos:cache npm run dev:quiet

# Enable only error-level debugging
DEBUG=bos:*:error npm run dev:quiet

# Enable specific patterns
DEBUG=bos:technician* npm run dev:quiet
```

### Environment-Specific Debugging
```bash
# Development with full debugging
NODE_ENV=development DEBUG=bos:* npm run dev:quiet

# Production-like testing with minimal debugging
NODE_ENV=production DEBUG=bos:api,bos:reactive npm run dev:quiet
```

## Adding Debug Calls to Components

### Import Debug Functions
```typescript
import { debugTechAssignment, debugAPI, debugState } from '$lib/utils/debug';
```

### Use Appropriate Formatters
```typescript
// Objects and arrays
debugAPI('User response: %o', userObject);
debugState('Selected IDs: %o', Array.from(selectedIds));

// Numbers
debugAPI('Response status: %d', response.status);

// Strings  
debugAPI('Operation: %s', operationName);

// JSON formatting
debugAPI('Config: %j', configObject);
```

### Component-Specific Patterns

#### Reactive Statement Debugging
```typescript
$: if (!isUpdating) {
  const newIds = new Set(assignedTechnicians.map(t => t.id));
  debugReactive('Reactive firing - data: %o, isUpdating: %s', 
    assignedTechnicians.map(t => t.id), isUpdating);
  selectedUserIds = newIds;
}
```

#### API Operation Debugging
```typescript
try {
  const response = await api.updateData(payload);
  debugAPI('Update successful: %o', response);
} catch (error) {
  debugAPI('Update failed: %o', error);
}
```

#### State Management Debugging
```typescript
function updateSelection(newIds: Set<string>) {
  debugState('Updating selection from %o to %o', 
    Array.from(currentIds), Array.from(newIds));
  selectedIds = newIds;
}
```

## Performance Considerations

### Zero Runtime Overhead
Debug calls have **zero performance impact** when debugging is disabled:
```typescript
// This will NOT execute expensive operations when debugging is off
debug('expensive: %o', computeExpensiveData());

// For expensive operations, use conditional checks:
if (debug.enabled) {
  debug('expensive: %o', computeExpensiveData());
}
```

### Production Builds
- Debug calls are automatically **stripped from production builds** via dead code elimination
- No manual cleanup required
- Bundle size impact: **~2KB** for the debug library (when enabled)

## Integration with Existing Tools

### CSRF Debug Panel
The project includes a visual CSRF debug panel for development. To use both systems together:

```svelte
<script>
  import CsrfDebugPanel from '$lib/components/dev/CsrfDebugPanel.svelte';
  import { debugAPI } from '$lib/utils/debug';
  
  // Use debug calls in your components
  debugAPI('Making authenticated request to %s', endpoint);
</script>

<!-- Visual CSRF debugging -->
<CsrfDebugPanel />
```

### Browser Developer Tools
Debug output integrates seamlessly with browser developer tools:
- **Color-coded namespaces** for easy visual distinction
- **Collapsible object inspection** using `%o` formatter
- **Performance timeline integration** for timing analysis

## Troubleshooting Debug Issues

### Debug Output Not Appearing
1. **Check environment variable**:
   ```bash
   echo $DEBUG  # Should show your debug pattern
   ```

2. **Verify browser settings**:
   ```javascript
   localStorage.debug  // Should show your pattern
   ```

3. **Check console for debug helper**:
   ```javascript
   bosDebug.status()  // Shows current settings
   ```

### Debug Calls Not Working
1. **Verify import paths**:
   ```typescript
   import { debugAPI } from '$lib/utils/debug';  // Correct
   import { debugAPI } from '../debug';         // Incorrect
   ```

2. **Check formatter syntax**:
   ```typescript
   debug('User: %o', user);     // Correct
   debug('User: ' + user);      // Less optimal
   ```

### Performance Issues
1. **Use conditional debugging for expensive operations**:
   ```typescript
   if (debugAPI.enabled) {
     debugAPI('Heavy computation: %o', expensiveFunction());
   }
   ```

2. **Prefer object formatters over string concatenation**:
   ```typescript
   debug('Data: %o', data);           // Good
   debug('Data: ' + JSON.stringify(data)); // Avoid
   ```

## Best Practices

### Namespace Organization
- Use **hierarchical namespaces**: `bos:component:subfeature`
- Group **related functionality**: `bos:technician-assignment`
- Avoid **overly specific namespaces**: prefer `bos:api` over `bos:api:users:fetch`

### Debug Message Quality
- **Be descriptive**: "Updating selectedIds to: %o" vs "Update: %o"
- **Include context**: "Technician assignment failed for job %s: %o"
- **Use appropriate formatters**: `%o` for objects, `%s` for strings, `%d` for numbers

### Development Workflow
1. **Start with broad debugging**: `DEBUG=bos:*`
2. **Narrow to specific areas**: `DEBUG=bos:technician-assignment`
3. **Remove or minimize for production testing**: `DEBUG=bos:api`
4. **Document important debug points** in component comments

### Code Organization
```typescript
// Group imports
import { debugComponent, debugAPI, debugState } from '$lib/utils/debug';

// Use consistent patterns
debugComponent('Component mounted');
debugState('State updated: %o', newState);
debugAPI('API call completed: %o', response);
```

## Testing with Debug Output

### Playwright Tests
Debug output can help with test debugging:
```bash
# Run tests with debugging enabled
DEBUG=bos:* npm run test

# Debug specific test areas
DEBUG=bos:technician-assignment npm run test:technician
```

### Manual Testing Scenarios
Use debug output to verify:
- **State synchronization** between components
- **API call sequencing** during complex operations
- **Cache invalidation timing** issues
- **Reactive statement execution** order

## Migration from Console.log

### Before (Manual Cleanup Required)
```typescript
console.log('User selected:', userId);
console.log('API response:', response);
// Manual removal needed for production
```

### After (Automatic Cleanup)
```typescript
import { debugTechAssignment, debugAPI } from '$lib/utils/debug';

debugTechAssignment('User selected: %s', userId);
debugAPI('API response: %o', response);
// Automatically stripped in production builds
```

### Migration Checklist
- [ ] Replace `console.log` with appropriate debug namespace
- [ ] Use proper formatters (`%o`, `%s`, `%d`)
- [ ] Test with debugging enabled/disabled
- [ ] Verify production builds exclude debug calls
- [ ] Update component documentation

## Future Enhancements

The debug system can be extended with:
- **Log aggregation** for production debugging
- **Remote debugging** capabilities
- **Debug output persistence** across page reloads
- **Integration with error tracking** services
- **Automated debug report generation**

## Related Documentation

- [Frontend Architecture](./frontend-architecture.md) - Component patterns
- [Troubleshooting Guide](./troubleshooting-guide.md) - Common issues
- [Performance Guidelines](./performance-guidelines.md) - Optimization patterns
- [CSRF Debug Panel](../guides/csrf-debug-panel.md) - Visual debugging tools