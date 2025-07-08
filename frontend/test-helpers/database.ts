/**
 * Frontend Test Database Utilities
 * 
 * Provides connection and management utilities for frontend tests
 * to interact with the Rails test database via API endpoints.
 */

export interface DatabaseConfig {
  railsPort: number;
  railsHost: string;
  testDatabaseName: string;
  apiBasePath: string;
}

export const DEFAULT_DB_CONFIG: DatabaseConfig = {
  railsPort: parseInt(process.env.RAILS_TEST_PORT || '3001'),
  railsHost: process.env.RAILS_TEST_HOST || 'localhost',
  testDatabaseName: 'bos_test',
  apiBasePath: '/api/v1'
};

/**
 * Database connection utilities for frontend tests
 */
export class TestDatabase {
  private config: DatabaseConfig;
  private baseUrl: string;

  constructor(config: DatabaseConfig = DEFAULT_DB_CONFIG) {
    this.config = config;
    this.baseUrl = `http://${config.railsHost}:${config.railsPort}${config.apiBasePath}`;
  }

  /**
   * Check if Rails test server is running and database is accessible
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      return response.ok;
    } catch (error) {
      console.warn('Rails test server not available:', error);
      return false;
    }
  }

  /**
   * Get Rails server URL for API calls
   */
  getApiUrl(endpoint: string = ''): string {
    return `${this.baseUrl}${endpoint}`;
  }

  /**
   * Get Rails server base URL
   */
  getRailsUrl(): string {
    return `http://${this.config.railsHost}:${this.config.railsPort}`;
  }

  /**
   * Wait for Rails server to be ready
   */
  async waitForServer(timeoutMs: number = 30000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      if (await this.isAvailable()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    throw new Error(`Rails test server not available after ${timeoutMs}ms`);
  }

  /**
   * Reset test database to clean state
   */
  async resetDatabase(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/test/reset_database`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to reset database: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Seed test database with standard test data
   */
  async seedDatabase(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/test/seed_database`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to seed database: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Set up clean test database state
   */
  async setupCleanState(): Promise<void> {
    await this.resetDatabase();
    await this.seedDatabase();
  }

  /**
   * Verify test data exists
   */
  async verifyTestData(): Promise<{ valid: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/test/verify_data`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        return { valid: false, message: `Server error: ${response.status}` };
      }

      const data = await response.json();
      
      // Handle JSON:API format from Rails
      if (data.data && data.data.attributes) {
        const attrs = data.data.attributes;
        return { valid: attrs.valid || false, message: attrs.message || 'Unknown status' };
      }
      
      // Handle direct format (fallback)
      return { valid: data.valid || false, message: data.message || 'Unknown status' };
    } catch (error) {
      return { valid: false, message: `Connection error: ${error}` };
    }
  }
}

/**
 * Global test database instance
 */
export const testDb = new TestDatabase();

/**
 * Database management utilities for test lifecycle
 */
export class DatabaseLifecycle {
  private db: TestDatabase;

  constructor(db: TestDatabase = testDb) {
    this.db = db;
  }

  /**
   * Setup database before test suite
   */
  async beforeSuite(): Promise<void> {
    console.log('🔄 Setting up test database...');
    
    // Wait for Rails server
    await this.db.waitForServer();
    
    // Setup clean state
    await this.db.setupCleanState();
    
    // Verify data
    const verification = await this.db.verifyTestData();
    if (!verification.valid) {
      throw new Error(`Test data verification failed: ${verification.message}`);
    }
    
    console.log('✅ Test database ready');
  }

  /**
   * Reset database before each test (optional - use for isolation)
   */
  async beforeTest(): Promise<void> {
    // Optional: reset for complete isolation
    // await this.db.setupCleanState();
  }

  /**
   * Cleanup after test
   */
  async afterTest(): Promise<void> {
    // Optional: cleanup specific test data
  }

  /**
   * Cleanup after test suite
   */
  async afterSuite(): Promise<void> {
    console.log('🧹 Test database cleanup complete');
  }
}

/**
 * Database transaction utilities for test isolation
 */
export class DatabaseTransaction {
  private db: TestDatabase;
  private transactionId: string | null = null;

  constructor(db: TestDatabase = testDb) {
    this.db = db;
  }

  /**
   * Start a database transaction for test isolation
   */
  async begin(): Promise<void> {
    const response = await fetch(`${this.db.getApiUrl('/test/begin_transaction')}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to begin transaction: ${response.status}`);
    }

    const data = await response.json();
    this.transactionId = data.transaction_id;
  }

  /**
   * Rollback transaction to restore database state
   */
  async rollback(): Promise<void> {
    if (!this.transactionId) {
      return;
    }

    const response = await fetch(`${this.db.getApiUrl('/test/rollback_transaction')}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ transaction_id: this.transactionId })
    });

    if (!response.ok) {
      console.warn(`Failed to rollback transaction: ${response.status}`);
    }

    this.transactionId = null;
  }

  /**
   * Commit transaction (rarely needed in tests)
   */
  async commit(): Promise<void> {
    if (!this.transactionId) {
      return;
    }

    const response = await fetch(`${this.db.getApiUrl('/test/commit_transaction')}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ transaction_id: this.transactionId })
    });

    if (!response.ok) {
      console.warn(`Failed to commit transaction: ${response.status}`);
    }

    this.transactionId = null;
  }
}

/**
 * Environment detection utilities
 */
export function shouldUseRealDatabase(): boolean {
  // Use real database when:
  // 1. Explicitly enabled via environment variable
  // 2. Running integration tests
  // 3. Not in CI environment (optional - can be overridden)
  
  if (process.env.USE_REAL_DB === 'true') return true;
  if (process.env.TEST_TYPE === 'integration') return true;
  if (process.env.TEST_REAL_DB === 'true') return true;
  
  // Default to mocked for speed unless specifically requested
  return false;
}

/**
 * Helper to determine test strategy
 */
export function getTestStrategy(): 'mocked' | 'real_db' | 'hybrid' {
  if (process.env.TEST_STRATEGY) {
    return process.env.TEST_STRATEGY as 'mocked' | 'real_db' | 'hybrid';
  }
  
  return shouldUseRealDatabase() ? 'real_db' : 'mocked';
}