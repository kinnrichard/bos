# Deprecated Tests

This folder contains tests that have been retired due to quality issues and replaced with better implementations.

## Retired Tests:

### `task-drag-drop.spec.ts` ⭐⭐ (Retired)
**Why Retired:**
- 130+ lines of brittle beforeEach setup logic
- Excessive debug screenshots cluttering test results  
- Complex selector fallback chains that were fragile
- Heavy reliance on `waitForTimeout()` instead of proper waits
- Magic numbers and poor error messages
- Test isolation issues with complex job discovery

**Replaced By:** New task interaction tests in `/pages/jobs-detail.spec.ts`

### `jobs.spec.ts` ⭐⭐ (Retired)  
**Why Retired:**
- Debugging code left in production tests
- Hard-coded localhost:4000 URLs throughout
- Poor test isolation with improper cleanup
- Inconsistent testing patterns within same file
- Environment dependencies and verbose debug output

**Replaced By:** `/pages/jobs-list.spec.ts` using professional patterns

### `task-drag-drop-multiselect.spec.ts` ⭐⭐⭐ (Retired)
**Why Retired:**
- Extensive use of `test.skip()` when test data doesn't exist
- Complex authentication setup recreated in every test
- Inconsistent error handling patterns
- Platform-specific code that wasn't reliable

**Replaced By:** Multi-select functionality testing integrated into `/pages/jobs-detail.spec.ts`

## Replacement Philosophy

The new tests follow patterns from the **best-written tests** identified in the codebase:

1. **Professional Architecture** - Using wrapper functions and environment configuration
2. **Console Monitoring** - Automatic Svelte warning detection  
3. **Real API Integration** - Testing against actual Rails backend with proper cleanup
4. **Proper Error Handling** - Comprehensive error states and recovery testing
5. **Quality Standards** - Zero console errors, proper timeouts, mobile responsiveness

## If You Need These Tests

If you need functionality from these retired tests, please refer to the new implementations in:
- `/tests/pages/jobs-list.spec.ts`
- `/tests/pages/jobs-detail.spec.ts`  
- `/tests/pages/logs-system.spec.ts`
- `/tests/pages/logs-client.spec.ts`

The new tests provide better coverage with significantly improved reliability and maintainability.