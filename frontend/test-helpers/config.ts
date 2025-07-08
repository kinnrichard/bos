/**
 * Test Configuration
 * 
 * Central configuration for hybrid testing strategy
 */

import { PlaywrightTestConfig, defineConfig } from '@playwright/test';

export interface HybridTestConfig {
  // Test strategy selection
  defaultStrategy: 'mocked' | 'real_db' | 'hybrid';
  
  // Database configuration
  database: {
    host: string;
    port: number;
    resetBetweenTests: boolean;
    isolationStrategy: 'none' | 'cleanup' | 'transaction' | 'reset';
    seedData: boolean;
  };
  
  // Rails server configuration
  rails: {
    host: string;
    port: number;
    startCommand?: string;
    waitTimeout: number;
  };
  
  // Test categorization
  testCategories: {
    unit: { strategy: 'mocked'; pattern: string };
    integration: { strategy: 'real_db'; pattern: string };
    e2e: { strategy: 'real_db'; pattern: string };
  };
  
  // Performance settings
  performance: {
    parallelWorkers: number;
    retries: number;
    timeout: number;
  };
}

/**
 * Default hybrid test configuration
 */
export const HYBRID_CONFIG: HybridTestConfig = {
  defaultStrategy: 'hybrid',
  
  database: {
    host: process.env.RAILS_TEST_HOST || 'localhost',
    port: parseInt(process.env.RAILS_TEST_PORT || '3001'),
    resetBetweenTests: false,
    isolationStrategy: 'cleanup',
    seedData: true
  },
  
  rails: {
    host: process.env.RAILS_TEST_HOST || 'localhost',
    port: parseInt(process.env.RAILS_TEST_PORT || '3001'),
    startCommand: process.env.RAILS_START_COMMAND,
    waitTimeout: 30000
  },
  
  testCategories: {
    unit: { 
      strategy: 'mocked', 
      pattern: '**/*.unit.spec.ts' 
    },
    integration: { 
      strategy: 'real_db', 
      pattern: '**/*.integration.spec.ts' 
    },
    e2e: { 
      strategy: 'real_db', 
      pattern: '**/*.e2e.spec.ts' 
    }
  },
  
  performance: {
    parallelWorkers: process.env.CI ? 1 : 2,
    retries: process.env.CI ? 2 : 0,
    timeout: 30000
  }
};

/**
 * Environment-specific configuration overrides
 */
export function getEnvironmentConfig(): Partial<HybridTestConfig> {
  if (process.env.CI) {
    return {
      performance: {
        parallelWorkers: 1,
        retries: 2,
        timeout: 60000
      },
      database: {
        ...HYBRID_CONFIG.database,
        resetBetweenTests: true,
        isolationStrategy: 'reset'
      }
    };
  }
  
  if (process.env.DEBUG === 'true') {
    return {
      performance: {
        parallelWorkers: 1,
        retries: 0,
        timeout: 0 // No timeout in debug mode
      }
    };
  }
  
  return {};
}

/**
 * Create Playwright configuration for hybrid testing
 */
export function createHybridPlaywrightConfig(
  overrides: Partial<PlaywrightTestConfig> = {}
): PlaywrightTestConfig {
  const config = { ...HYBRID_CONFIG, ...getEnvironmentConfig() };
  
  return defineConfig({
    testDir: 'tests',
    testMatch: /(.+\.)?(test|spec)\.[jt]s/,
    timeout: config.performance.timeout,
    
    expect: {
      timeout: 5000,
    },
    
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: config.performance.retries,
    workers: config.performance.parallelWorkers,
    
    reporter: process.env.CI ? 'github' : 'html',
    
    use: {
      baseURL: 'http://localhost:4173', // Svelte dev server
      trace: 'on-first-retry',
      screenshot: 'only-on-failure',
      video: 'retain-on-failure',
    },
    
    projects: [
      // Unit tests - fast, mocked APIs
      {
        name: 'unit',
        testMatch: config.testCategories.unit.pattern,
        use: {
          // No special setup needed for unit tests
        },
      },
      
      // Integration tests - real database
      {
        name: 'integration',
        testMatch: config.testCategories.integration.pattern,
        use: {
          // Will use real database connection
        },
      },
      
      // E2E tests - full real database
      {
        name: 'e2e',
        testMatch: config.testCategories.e2e.pattern,
        use: {
          // Full browser context with real backend
        },
      },
      
      // Default tests - hybrid strategy
      {
        name: 'hybrid',
        testMatch: /(?<!\.(?:unit|integration|e2e))\.spec\.ts$/,
        use: {
          // Dynamic strategy based on test content
        },
      },
    ],
    
    webServer: [
      // Svelte frontend server
      {
        command: 'npm run build && npm run preview',
        port: 4173,
        timeout: 120 * 1000,
        reuseExistingServer: !process.env.CI,
      },
      
      // Rails backend server (conditional)
      ...(shouldStartRailsServer() ? [{
        command: config.rails.startCommand || `RAILS_ENV=test rails server -p ${config.rails.port}`,
        port: config.rails.port,
        timeout: config.rails.waitTimeout,
        reuseExistingServer: !process.env.CI,
      }] : []),
    ],
    
    ...overrides,
  });
}

/**
 * Determine if Rails server should be started
 */
function shouldStartRailsServer(): boolean {
  // Start Rails server if:
  // 1. Using real database strategy
  // 2. Not explicitly disabled
  // 3. Rails start command is provided or default is acceptable
  
  if (process.env.SKIP_RAILS_SERVER === 'true') {
    return false;
  }
  
  if (process.env.USE_REAL_DB === 'true') {
    return true;
  }
  
  if (process.env.TEST_STRATEGY === 'real_db') {
    return true;
  }
  
  // Default: don't start Rails server (assume external server)
  return false;
}

/**
 * Get test strategy for current test file
 */
export function getTestStrategyForFile(testFilePath: string): 'mocked' | 'real_db' {
  const config = { ...HYBRID_CONFIG, ...getEnvironmentConfig() };
  
  // Check if file matches specific category patterns
  if (testFilePath.match(config.testCategories.unit.pattern)) {
    return config.testCategories.unit.strategy;
  }
  
  if (testFilePath.match(config.testCategories.integration.pattern)) {
    return config.testCategories.integration.strategy;
  }
  
  if (testFilePath.match(config.testCategories.e2e.pattern)) {
    return config.testCategories.e2e.strategy;
  }
  
  // Default strategy based on environment
  if (process.env.TEST_STRATEGY === 'mocked') {
    return 'mocked';
  }
  
  if (process.env.TEST_STRATEGY === 'real_db') {
    return 'real_db';
  }
  
  // Hybrid default: prefer mocked for speed unless specifically requested
  return process.env.USE_REAL_DB === 'true' ? 'real_db' : 'mocked';
}

/**
 * Test environment utilities
 */
export class TestEnvironment {
  /**
   * Check if environment is configured for hybrid testing
   */
  static isHybridConfigured(): boolean {
    return process.env.TEST_STRATEGY === 'hybrid' || 
           HYBRID_CONFIG.defaultStrategy === 'hybrid';
  }
  
  /**
   * Get current test strategy from environment
   */
  static getCurrentStrategy(): 'mocked' | 'real_db' | 'hybrid' {
    return (process.env.TEST_STRATEGY as any) || HYBRID_CONFIG.defaultStrategy;
  }
  
  /**
   * Check if Rails server should be available
   */
  static shouldHaveRailsServer(): boolean {
    const strategy = this.getCurrentStrategy();
    return strategy === 'real_db' || strategy === 'hybrid';
  }
  
  /**
   * Get configuration for current environment
   */
  static getConfig(): HybridTestConfig {
    return { ...HYBRID_CONFIG, ...getEnvironmentConfig() };
  }
  
  /**
   * Validate test environment setup
   */
  static async validateEnvironment(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    // Check required environment variables
    if (this.shouldHaveRailsServer()) {
      const config = this.getConfig();
      
      // Check if Rails server is running
      try {
        const response = await fetch(`http://${config.rails.host}:${config.rails.port}/api/v1/health`);
        if (!response.ok) {
          issues.push('Rails server not responding to health check');
        }
      } catch {
        issues.push('Rails server not accessible');
      }
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }
  
  /**
   * Print current configuration
   */
  static printConfig(): void {
    const config = this.getConfig();
    console.log('\n🔧 Hybrid Test Configuration:');
    console.log(`   Strategy: ${this.getCurrentStrategy()}`);
    console.log(`   Rails Server: ${config.rails.host}:${config.rails.port}`);
    console.log(`   Isolation: ${config.database.isolationStrategy}`);
    console.log(`   Workers: ${config.performance.parallelWorkers}`);
    console.log(`   CI Mode: ${!!process.env.CI}`);
    console.log('');
  }
}