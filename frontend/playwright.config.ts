import { devices } from '@playwright/test';
import { createHybridPlaywrightConfig } from './tests/helpers/config';

const authFile = 'playwright/.auth/user.json';

// Use the hybrid configuration with browser device overrides
export default createHybridPlaywrightConfig({
  projects: [
    // Authentication setup - runs first (WebKit for browser compatibility)
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: { ...devices['Desktop Safari'] },
    },

    // Unit tests - fast, mocked APIs (no auth needed)
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

    // Integration tests - real database (with auth)
    {
      name: 'integration-chromium',
      testMatch: '**/*.integration.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
      dependencies: ['setup'],
    },
    {
      name: 'integration-firefox',
      testMatch: '**/*.integration.spec.ts',
      use: {
        ...devices['Desktop Firefox'],
        storageState: authFile,
      },
      dependencies: ['setup'],
    },

    // E2E tests - full real database (with auth)
    {
      name: 'e2e-chromium',
      testMatch: '**/*.e2e.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
      dependencies: ['setup'],
    },

    // API tests - backend testing (no browser auth needed)
    {
      name: 'api-tests',
      testMatch: '**/*.api.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },

    // Default tests - hybrid strategy based on content (with auth)
    {
      name: 'hybrid-chromium',
      testMatch: /(?<!\.(unit|integration|e2e|api|setup))\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
      dependencies: ['setup'],
    },
    {
      name: 'hybrid-firefox',
      testMatch: /(?<!\.(unit|integration|e2e|api|setup))\.spec\.ts$/,
      use: {
        ...devices['Desktop Firefox'],
        storageState: authFile,
      },
      dependencies: ['setup'],
    },
    {
      name: 'hybrid-webkit',
      testMatch: /(?<!\.(unit|integration|e2e|api|setup))\.spec\.ts$/,
      use: {
        ...devices['Desktop Safari'],
        storageState: authFile,
      },
      dependencies: ['setup'],
    },
  ],
});
