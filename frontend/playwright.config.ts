import { defineConfig, devices } from '@playwright/test';
import { createHybridPlaywrightConfig } from './test-helpers/config';

// Use the hybrid configuration with browser device overrides
export default createHybridPlaywrightConfig({
  projects: [
    // Unit tests - fast, mocked APIs
    {
      name: 'unit-chromium',
      testMatch: '**/*.unit.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'unit-firefox',
      testMatch: '**/*.unit.spec.ts', 
      use: { ...devices['Desktop Firefox'] },
    },
    
    // Integration tests - real database
    {
      name: 'integration-chromium',
      testMatch: '**/*.integration.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'integration-firefox',
      testMatch: '**/*.integration.spec.ts',
      use: { ...devices['Desktop Firefox'] },
    },
    
    // E2E tests - full real database
    {
      name: 'e2e-chromium',
      testMatch: '**/*.e2e.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    
    // API tests - backend testing
    {
      name: 'api-tests',
      testMatch: '**/*.api.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    
    // Default tests - hybrid strategy based on content
    {
      name: 'hybrid-chromium',
      testMatch: /(?<!\.(unit|integration|e2e|api))\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'hybrid-firefox',
      testMatch: /(?<!\.(unit|integration|e2e|api))\.spec\.ts$/,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'hybrid-webkit',
      testMatch: /(?<!\.(unit|integration|e2e|api))\.spec\.ts$/,
      use: { ...devices['Desktop Safari'] },
    },
  ]
});
