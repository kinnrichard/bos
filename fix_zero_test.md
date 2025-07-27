# Fix Zero Test Environment Connection Issue

## Problem Statement

Zero is connecting to the **development** environment instead of the **test** environment during test execution, causing tests to receive development data instead of test fixtures. This breaks test isolation and causes unpredictable test results.

**Symptoms:**
- Tests show development data instead of seeded test fixtures
- "📋 No jobs found" in frontend despite test database having data
- Zero authentication works but connects to wrong database environment

## Root Cause Analysis

### Port Configuration Mismatch

The project has inconsistent port configurations across different files:

**Intended Port Layout** (Zero convention):
- Development Zero: `4848`
- Test Zero: `4850`

**Previous Misconfigurations (FIXED):**
- `bin/testkill`: `ZERO_PORT=5848` ❌ (fixed to `4850`)
- `package.json` test:servers:kill: port `5848` ❌ (fixed to `4850`)
- All other files correctly use `4850` for Zero test port

### Frontend Environment Detection Issue

**Problem (FIXED)**: `frontend/src/lib/zero/zero-config.ts` now implements environment detection:
- Detects test environment via frontend port `6173` → connects to Zero port `4850`
- Detects development environment via frontend port `5173` → connects to Zero port `4848`
- SSR detection via `NODE_ENV` or `RAILS_ENV` environment variables

## Current State

### File Analysis - CURRENT STATUS

1. **`config/zero.yml`** ✅ **CORRECT**
   - Development: port `4848` ✅
   - Test: port `4850` ✅
   - Test auth secret: matches development pattern ✅

2. **`frontend/src/lib/zero/zero-config.ts`** ✅ **FIXED**
   - Implements environment detection ✅
   - SSR fallback with environment detection ✅
   - Browser detection via frontend port ✅

3. **`frontend/tests/helpers/config.ts`** ✅ **CORRECT**
   - Test configuration: `ZERO_TEST_PORT: '4850'` ✅

4. **`bin/test-servers`** ✅ **CORRECT**
   - Default: `ZERO_TEST_PORT=4850` ✅

5. **`bin/testkill`** ✅ **FIXED**
   - Zero port: `4850` ✅ (was `5848`)

6. **`package.json`** ✅ **FIXED**
   - test:servers:kill: port `4850` ✅ (was `5848`)

7. **Database Configuration** ✅ **CORRECT**
   - Development DBs: `bos_development`, `bos_zero_cvr_development`, `bos_zero_cdb_development`
   - Test DBs: `bos_test`, `bos_zero_cvr_test`, `bos_zero_cdb_test`

## Target State

### Correct Port Layout ✅ **ACHIEVED**
- **Development Zero**: `4848` (connects to development databases) ✅
- **Test Zero**: `4850` (connects to test databases) ✅  
- **Frontend**: Environment-aware connection (detects correct Zero port) ✅

### Environment Detection Strategy ✅ **IMPLEMENTED**
- When frontend runs on port `6173` (test) → connect to Zero port `4850` ✅
- When frontend runs on port `5173` (development) → connect to Zero port `4848` ✅
- SSR fallback based on `NODE_ENV` and `RAILS_ENV` environment variables ✅

## Implementation Steps

### Step 1: Fix Zero Configuration Files

**File**: `config/zero.yml`
```yaml
# Change line 67 from:
port: 4850
# To:
port: 5848
```

### Step 2: Fix Test Helper Configuration

**File**: `frontend/tests/helpers/config.ts`
```typescript
// Change line 234 from:
ZERO_TEST_PORT: '4850',
// To:
ZERO_TEST_PORT: '5848',
```

### Step 3: Fix Test Server Script

**File**: `bin/test-servers`
```bash
# Change line 16 from:
ZERO_TEST_PORT=${ZERO_TEST_PORT:-4850}
# To:
ZERO_TEST_PORT=${ZERO_TEST_PORT:-5848}
```

### Step 4: Implement Frontend Environment Detection

**File**: `frontend/src/lib/zero/zero-config.ts`

Replace the `getServerUrl()` method:

```typescript
getServerUrl(): string {
  if (typeof window === 'undefined') {
    // SSR fallback - detect environment from process.env or default to development
    const isTest = process.env.NODE_ENV === 'test' || process.env.RAILS_ENV === 'test';
    return isTest ? 'http://localhost:5848' : 'http://localhost:4848';
  }
  
  // Browser environment - detect based on frontend port
  const frontendPort = window.location.port;
  let zeroPort: string;
  
  if (frontendPort === '6173') {
    // Test environment (frontend test port)
    zeroPort = '5848';
  } else if (frontendPort === '5173') {
    // Development environment (frontend dev port)  
    zeroPort = '4848';
  } else {
    // Fallback to development for unknown ports
    zeroPort = '4848';
  }
  
  return `${window.location.protocol}//${window.location.hostname}:${zeroPort}`;
},
```

## Testing Plan

### Phase 1: Configuration Validation

1. **Verify port configurations**:
   ```bash
   # Check config files have correct ports
   grep -n "port.*5848" config/zero.yml
   grep -n "ZERO_TEST_PORT.*5848" frontend/tests/helpers/config.ts
   grep -n "ZERO_TEST_PORT.*5848" bin/test-servers
   ```

2. **Verify frontend environment detection**:
   ```bash
   # Test that frontend connects to correct ports
   # (Manual verification in browser dev tools)
   ```

### Phase 2: Server Startup Validation

1. **Start test servers**:
   ```bash
   bin/test-servers
   ```

2. **Verify Zero test server runs on port 5848**:
   ```bash
   lsof -i :5848 | grep zero
   ```

3. **Verify development Zero runs on port 4848** (if running):
   ```bash
   lsof -i :4848 | grep zero
   ```

### Phase 3: Environment Isolation Testing

1. **Test database isolation**:
   ```bash
   # Verify test Zero connects to test databases
   curl -s http://localhost:5848/health # or appropriate health check
   
   # Verify development Zero connects to dev databases  
   curl -s http://localhost:4848/health # or appropriate health check
   ```

2. **Frontend connection testing**:
   ```bash
   # Run frontend tests and verify Zero connections
   cd frontend && npm test -- jobs.spec.ts
   ```

3. **Data isolation verification**:
   - Verify test data (fixtures) appears in tests
   - Verify development data doesn't leak into tests
   - Verify test data doesn't affect development

### Phase 4: End-to-End Test Validation

1. **Run affected test suites**:
   ```bash
   cd frontend && npm test -- --project=e2e-chromium jobs.spec.ts
   cd frontend && npm test -- --project=e2e-chromium jobs-list.spec.ts
   ```

2. **Verify test results**:
   - Tests should pass with fixture data
   - No "📋 No jobs found" errors
   - Authentication works with test users

## Rollback Plan

### If Issues Occur During Implementation

**Step 1: Revert Configuration Files**
```bash
# Revert config/zero.yml
git checkout HEAD -- config/zero.yml

# Revert frontend test config
git checkout HEAD -- frontend/tests/helpers/config.ts

# Revert test servers script
git checkout HEAD -- bin/test-servers
```

**Step 2: Revert Frontend Changes**
```bash
# Revert Zero configuration
git checkout HEAD -- frontend/src/lib/zero/zero-config.ts
```

**Step 3: Restart Servers**
```bash
# Kill all test servers
bin/testkill

# Restart with original configuration
bin/test-servers
```

### Emergency Fallback

If complete rollback is needed:
```bash
# Reset to last known good commit
git reset --hard <last-good-commit-hash>

# Force restart all servers
pkill -f "rails server"
pkill -f "zero"
pkill -f "vite"

# Restart development environment
bin/dev
```

## Implementation Checklist

- [ ] **Step 1**: Update `config/zero.yml` test port: `4850` → `5848`
- [ ] **Step 2**: Update `frontend/tests/helpers/config.ts`: `ZERO_TEST_PORT: '4850'` → `'5848'`
- [ ] **Step 3**: Update `bin/test-servers`: `ZERO_TEST_PORT=4850` → `5848`
- [ ] **Step 4**: Implement environment detection in `frontend/src/lib/zero/zero-config.ts`
- [ ] **Test 1**: Verify Zero test server starts on port 5848
- [ ] **Test 2**: Verify frontend connects to correct Zero port based on environment
- [ ] **Test 3**: Run job tests and verify fixture data appears
- [ ] **Test 4**: Verify development environment still works on port 4848
- [ ] **Commit**: Create commit with port configuration fixes

## Success Criteria

✅ **Environment Isolation**: Test and development Zero servers use different ports and databases

✅ **Correct Port Usage**: 
- Test Zero: port 5848 with test databases
- Development Zero: port 4848 with development databases

✅ **Frontend Detection**: Frontend automatically connects to correct Zero port based on environment

✅ **Test Reliability**: Tests consistently use fixture data and pass reliably

✅ **Development Stability**: Development environment continues to work without disruption

## Additional Notes

- This fix addresses the root cause of test data inconsistency
- Proper environment isolation will improve test reliability
- Changes are backward compatible with existing development workflows
- Port 5848 aligns with project's intended port allocation strategy