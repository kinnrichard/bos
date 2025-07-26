/**
 * Authentication Setup for Playwright Tests
 *
 * This setup runs once before all tests and saves the authenticated state
 * to be reused across test runs, following Playwright best practices.
 *
 * Uses the LoginPage object for consistent authentication flow.
 */

import { test as setup } from '@playwright/test';
import { LoginPage, verifyAuthentication } from '../test-helpers';

// Constants
const AUTH_FILE = 'playwright/.auth/user.json';
const AUTH_TIMEOUT = 10000;
const DEBUG_MODE = process.env.DEBUG_AUTH_SETUP === 'true';

interface AuthSetupOptions {
  verbose?: boolean;
  requireInitials?: boolean;
  useFallback?: boolean;
}

/**
 * Perform authentication setup with verification
 */
async function performAuthSetup(
  loginPage: LoginPage,
  options: AuthSetupOptions = {}
): Promise<void> {
  const { verbose = DEBUG_MODE, requireInitials = false, useFallback = true } = options;

  if (verbose) {
    console.log('[AUTH SETUP] 🚀 Starting authentication process...');
    console.log(`[AUTH SETUP] Authenticating as: ${LoginPage.DEFAULT_CREDENTIALS.email}`);
  }

  // Perform login
  await loginPage.login(LoginPage.DEFAULT_CREDENTIALS);

  if (verbose) {
    console.log('[AUTH SETUP] Verifying authentication state...');
  }

  // Verify authentication success
  const authResult = await verifyAuthentication(loginPage.getPage(), {
    timeout: AUTH_TIMEOUT,
    requireInitials,
    verbose: verbose, // Pass through verbose setting
    useFallback,
  });

  // Handle verification results
  if (!authResult.authVerified) {
    const details = [
      `menu=${authResult.userMenuFound}`,
      `initials=${authResult.userInitialsFound}`,
      `fallback=${authResult.fallbackVerified}`,
    ].join(', ');

    console.error('[AUTH SETUP] ❌ Authentication verification failed');
    console.error(`[AUTH SETUP] Details: ${details}`);
    console.error('[AUTH SETUP] Try: DEBUG_AUTH_SETUP=true npm test for detailed logs');

    // Still proceed - authentication might work differently
  } else if (verbose) {
    console.log('[AUTH SETUP] ✅ Authentication verified successfully');
    if (authResult.initialsText) {
      console.log(`[AUTH SETUP] User initials: ${authResult.initialsText}`);
    }
  }
}

/**
 * Save authentication state for reuse in tests
 */
async function saveAuthState(loginPage: LoginPage): Promise<void> {
  if (DEBUG_MODE) {
    console.log(`[AUTH SETUP] Saving authentication state to: ${AUTH_FILE}`);
  }

  await loginPage.getPage().context().storageState({ path: AUTH_FILE });

  if (DEBUG_MODE) {
    console.log('[AUTH SETUP] ✅ Authentication setup complete');
  }
}

/**
 * Main authentication setup test
 */
setup('authenticate', async ({ page }) => {
  try {
    // Initialize login page
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Wait for page to be ready
    await page.waitForLoadState('networkidle');

    // Perform authentication (verbose controlled by DEBUG_MODE)
    await performAuthSetup(loginPage, {
      requireInitials: false,
      useFallback: true,
    });

    // Save authentication state
    await saveAuthState(loginPage);

    // Show simple success message (unless in debug mode)
    if (!DEBUG_MODE) {
      console.log('[AUTH SETUP] ✓ Ready');
    }
  } catch (error) {
    console.error('[AUTH SETUP] ❌ Authentication failed:', error);
    console.error('[AUTH SETUP] Try: DEBUG_AUTH_SETUP=true npm test for detailed logs');
    throw error; // Re-throw to fail the setup
  }
});
