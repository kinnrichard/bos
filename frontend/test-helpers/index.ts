/**
 * Frontend Test Helpers
 * 
 * Central export for all test utilities supporting hybrid testing strategy
 */

// Database utilities
export {
  testDb,
  TestDatabase,
  DatabaseLifecycle,
  DatabaseTransaction,
  shouldUseRealDatabase,
  getTestStrategy,
  DEFAULT_DB_CONFIG
} from './database';

// Authentication utilities
export {
  AuthHelper,
  ContextAuthHelper,
  UserFactory,
  AuthTestUtils,
  type TestUser,
  type AuthTokens
} from './auth';

// Data factories
export {
  DataFactory,
  TestScenarios,
  TestDataUtils,
  type JobData,
  type TaskData,
  type ClientData,
  type UserData
} from './data-factories';

// Test isolation and lifecycle
export {
  test,
  testWithRealDB,
  testWithAuth,
  testWithReset,
  testWithTransaction,
  testWithMocks,
  TestIsolation,
  TestConfig,
  TestLifecycle,
  TestDebug,
  skipIfMocked,
  skipIfRealDB,
  runOnlyWith,
  isUsingRealDatabase,
  isUsingMocks,
  type TestContext,
  type IsolationStrategy,
  type TestOptions
} from './isolation';

// Configuration
export {
  HYBRID_CONFIG,
  createHybridPlaywrightConfig,
  getTestStrategyForFile,
  TestEnvironment,
  type HybridTestConfig
} from './config';

/**
 * Quick setup utilities for common test patterns
 */

// Convenience re-exports for most common usage
export { expect } from '@playwright/test';

/**
 * Test setup helper - call this in your test files for automatic configuration
 */
export function setupTestEnvironment() {
  // This can be called in test files to automatically configure the environment
  // Currently just exports the configuration, but could be extended
  if (process.env.DEBUG === 'true') {
    TestEnvironment.printConfig();
  }
}

/**
 * Quick test creators for common patterns
 */
export const quickTests = {
  /**
   * Create a test that uses real database with cleanup
   */
  withRealDB: testWithRealDB,
  
  /**
   * Create a test with authentication
   */
  withAuth: testWithAuth,
  
  /**
   * Create a test using mocked APIs (fast)
   */
  withMocks: testWithMocks,
  
  /**
   * Create a test with full database reset (slow but clean)
   */
  withReset: testWithReset
};

/**
 * Assertion helpers for common patterns
 */
export const assertions = {
  /**
   * Assert that an entity exists in the database
   */
  async entityExists(page: any, entityType: string, entityId: string): Promise<void> {
    const exists = await TestDataUtils.waitForEntity(page, entityType, entityId, 5000);
    if (!exists) {
      throw new Error(`Entity ${entityType}/${entityId} does not exist in database`);
    }
  },
  
  /**
   * Assert that entity has specific data
   */
  async entityHasData(
    page: any, 
    entityType: string, 
    entityId: string, 
    expectedData: Record<string, any>
  ): Promise<void> {
    const matches = await TestDataUtils.verifyEntityData(page, entityType, entityId, expectedData);
    if (!matches) {
      throw new Error(`Entity ${entityType}/${entityId} does not match expected data`);
    }
  }
};

/**
 * Common test data patterns
 */
export const testData = {
  /**
   * Standard test users
   */
  users: UserFactory.getTestUsers(),
  
  /**
   * Create minimal job for testing
   */
  createMinimalJob: (factory: DataFactory) => factory.createJob({
    title: 'Minimal Test Job',
    status: 'active',
    priority: 'medium'
  }),
  
  /**
   * Create job with tasks for testing
   */
  createJobWithTasks: (factory: DataFactory, taskCount = 3) => 
    factory.createJobWithTasks({
      title: 'Test Job with Tasks',
      status: 'active'
    }, taskCount)
};

/**
 * Environment detection helpers
 */
export const env = {
  isCI: !!process.env.CI,
  isDebug: process.env.DEBUG === 'true',
  isUsingRealDB: isUsingRealDatabase,
  isUsingMocks: isUsingMocks,
  strategy: getTestStrategy()
};