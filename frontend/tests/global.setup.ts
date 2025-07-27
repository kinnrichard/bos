/**
 * Global Test Setup for Playwright
 *
 * This file runs once before all tests and handles:
 * 1. Database seeding - ensures test data exists
 * 2. Authentication setup - creates reusable auth state
 *
 * This follows Playwright best practices for global setup with proper
 * dependency management between setup tasks.
 */

/* eslint-disable no-console */

import { chromium, FullConfig } from '@playwright/test';
import { TestDatabase } from './helpers/database';
import { LoginPage, verifyAuthentication } from './helpers';
import { debugAuth, debugError } from '$lib/utils/debug';

// Constants
const AUTH_FILE = 'playwright/.auth/user.json';
const DEBUG_MODE = process.env.DEBUG_AUTH_SETUP === 'true';

/**
 * Global Setup Function
 *
 * This function runs once before all tests and handles database seeding
 * and authentication setup in the correct order.
 */
async function globalSetup(_config: FullConfig) {
  console.log('🚀 Starting global test setup...');

  // Step 1: Seed Test Database
  console.log('🌱 Setting up test database...');

  try {
    const testDb = new TestDatabase();

    // Wait for Rails test server to be ready
    console.log('⏳ Waiting for Rails test server...');
    await testDb.waitForServer(30000);

    // Verify server is responding
    const isAvailable = await testDb.isAvailable();
    if (!isAvailable) {
      throw new Error('Rails test server not responding to health checks');
    }

    console.log('🔄 Resetting and seeding test database...');

    // Reset database to clean state and seed with test data
    await testDb.setupCleanState();

    // Verify seeding was successful
    const verification = await testDb.verifyTestData();
    if (!verification.valid) {
      throw new Error(`Database seeding verification failed: ${verification.message}`);
    }

    console.log('✅ Test database ready with seed data');

    if (DEBUG_MODE) {
      debugAuth('Database seeding completed successfully');
      debugAuth(`Verification: ${verification.message}`);
    }
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    debugError('Database seeding error:', error);
    throw error; // Fail fast if database setup fails
  }

  // Step 2: Authenticate User
  console.log('🔐 Setting up authentication...');

  try {
    // Launch browser for authentication
    const browser = await chromium.launch();
    const context = await browser.newContext({
      baseURL: 'http://localhost:6173', // Frontend test server URL
    });
    const page = await context.newPage();

    // Initialize login page
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Wait for page to be ready
    await page.waitForLoadState('networkidle');

    if (DEBUG_MODE) {
      debugAuth('🚀 Starting authentication process...');
      debugAuth(`Authenticating as: ${LoginPage.DEFAULT_CREDENTIALS.email}`);
    }

    // Perform login with default test credentials
    await loginPage.login(LoginPage.DEFAULT_CREDENTIALS);

    if (DEBUG_MODE) {
      debugAuth('Verifying authentication state...');
    }

    // Verify authentication success
    const authResult = await verifyAuthentication(page, {
      timeout: 10000,
      requireInitials: false,
      verbose: DEBUG_MODE,
      useFallback: true,
    });

    // Handle verification results
    if (!authResult.authVerified) {
      const details = [
        `menu=${authResult.userMenuFound}`,
        `initials=${authResult.userInitialsFound}`,
        `fallback=${authResult.fallbackVerified}`,
      ].join(', ');

      console.warn('⚠️ Authentication verification had issues but proceeding');
      console.warn(`Details: ${details}`);

      if (DEBUG_MODE) {
        debugError('Authentication verification failed');
        debugError(`Details: ${details}`);
      }
    } else {
      console.log('✅ Authentication verified successfully');

      if (DEBUG_MODE) {
        debugAuth('✅ Authentication verified successfully');
        if (authResult.initialsText) {
          debugAuth(`User initials: ${authResult.initialsText}`);
        }
      }
    }

    // Save authentication state for reuse in tests
    console.log('💾 Saving authentication state...');
    await context.storageState({ path: AUTH_FILE });

    console.log('✅ Authentication setup complete');

    if (DEBUG_MODE) {
      debugAuth(`Authentication state saved to: ${AUTH_FILE}`);
      debugAuth('✅ Global authentication setup complete');
    }

    // Clean up browser
    await browser.close();
  } catch (error) {
    console.error('❌ Authentication setup failed:', error);
    debugError('Authentication setup error:', error);
    debugError('Try: DEBUG_AUTH_SETUP=true npm test for detailed logs');
    throw error; // Re-throw to fail the setup
  }

  console.log('🎉 Global setup complete - ready for tests!');
}

export default globalSetup;
