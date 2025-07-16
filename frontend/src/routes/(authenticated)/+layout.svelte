<!--
  Authenticated Layout - Zero Readiness Gate
  
  This layout ensures Zero.js is fully initialized before rendering
  any data-dependent pages, eliminating loading flashes.
  
  Two-stage loading architecture:
  1. Stage 1 (here): "Connecting to data..." - Zero initialization
  2. Stage 2 (pages): "Loading jobs..." - Data loading
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { initZero, getZeroState } from '$lib/zero';
  import { authService } from '$lib/api/auth';
  import AppLoading from '$lib/components/AppLoading.svelte';
  
  let { children } = $props();

  type ZeroState = 'checking' | 'unauthenticated' | 'initializing' | 'ready' | 'error';
  
  let zeroState = $state<ZeroState>('checking');
  let errorMessage = $state<string | null>(null);
  let retryCount = $state(0);
  const maxRetries = 3;

  onMount(async () => {
    if (!browser) return;
    
    const startTime = Date.now();
    console.log('🧪 [Auth Layout] TIMELINE START:', { timestamp: startTime });
    
    try {
      console.log('🏗️ [Authenticated Layout] Starting Zero readiness gate...');
      
      // Stage 1: Check authentication first
      zeroState = 'checking';
      const authCheckStart = Date.now();
      console.log('🧪 [Auth Layout] AUTH CHECK START:', { 
        timestamp: authCheckStart, 
        elapsed: authCheckStart - startTime 
      });
      
      const isAuthenticated = await authService.checkAuth();
      const authCheckEnd = Date.now();
      
      if (!isAuthenticated) {
        console.log('🧪 [Auth Layout] AUTH FAILED:', { 
          timestamp: authCheckEnd, 
          elapsed: authCheckEnd - startTime,
          authDuration: authCheckEnd - authCheckStart
        });
        zeroState = 'unauthenticated';
        
        // Build return URL for post-login redirect
        const returnTo = encodeURIComponent($page.url.pathname + $page.url.search);
        await goto(`/login?return_to=${returnTo}`, { replaceState: true });
        return;
      }
      
      console.log('🧪 [Auth Layout] AUTH SUCCESS:', { 
        timestamp: authCheckEnd, 
        elapsed: authCheckEnd - startTime,
        authDuration: authCheckEnd - authCheckStart
      });
      
      // Stage 2: Initialize Zero client
      zeroState = 'initializing';
      const zeroInitStart = Date.now();
      console.log('🧪 [Auth Layout] ZERO INIT START:', { 
        timestamp: zeroInitStart, 
        elapsed: zeroInitStart - startTime 
      });
      
      await initZero();
      const zeroInitEnd = Date.now();
      
      // Verify Zero is actually ready
      const state = getZeroState();
      if (!state.isInitialized || state.initializationState !== 'success') {
        throw new Error('Zero client initialization incomplete');
      }
      
      console.log('🧪 [Auth Layout] ZERO READY! CRITICAL TIMING:', { 
        timestamp: zeroInitEnd, 
        totalElapsed: zeroInitEnd - startTime,
        zeroInitDuration: zeroInitEnd - zeroInitStart,
        zeroState: state,
        message: 'Pages will now mount and start queries'
      });
      zeroState = 'ready';
      
    } catch (error) {
      console.error('🏗️ [Authenticated Layout] Initialization failed:', error);
      
      // Retry logic for transient failures
      if (retryCount < maxRetries) {
        retryCount++;
        console.log(`🏗️ [Authenticated Layout] Retrying (${retryCount}/${maxRetries}) in 2s...`);
        
        setTimeout(() => {
          // Reset state and retry
          zeroState = 'checking';
          errorMessage = null;
          // onMount will re-run the initialization
          window.location.reload();
        }, 2000);
        return;
      }
      
      // Max retries exceeded
      zeroState = 'error';
      errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
    }
  });

  function handleRetry() {
    retryCount = 0;
    zeroState = 'checking';
    errorMessage = null;
    window.location.reload();
  }

  // Debug info for development
  $effect(() => {
    if (browser && typeof window !== 'undefined') {
      (window as any).authLayoutDebug = {
        zeroState,
        errorMessage,
        retryCount,
        getZeroState,
        retry: handleRetry
      };
    }
  });
</script>

<!-- Zero Readiness Gate UI -->
{#if zeroState === 'checking'}
  <AppLoading message="Verifying authentication..." />
{:else if zeroState === 'unauthenticated'}
  <!-- Show nothing while redirecting to login -->
  <AppLoading message="Redirecting to login..." />
{:else if zeroState === 'initializing'}
  <AppLoading message="Connecting to data..." />
{:else if zeroState === 'error'}
  <div class="error-state">
    <div class="error-content">
      <div class="error-icon">⚠️</div>
      <h1 class="error-title">Connection Failed</h1>
      <p class="error-message">
        {errorMessage || 'Unable to connect to the data service'}
      </p>
      <div class="error-actions">
        <button class="button button--primary" onclick={handleRetry}>
          Try Again
        </button>
        <button class="button button--secondary" onclick={() => goto('/login')}>
          Back to Login
        </button>
      </div>
      {#if retryCount > 0}
        <p class="error-retry-info">
          Retry attempt: {retryCount}/{maxRetries}
        </p>
      {/if}
    </div>
  </div>
{:else if zeroState === 'ready'}
  <!-- Zero is ready - render protected content -->
  {@render children()}
{/if}

<style>
  .error-state {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--bg-black, #000);
    padding: 20px;
  }

  .error-content {
    text-align: center;
    max-width: 400px;
  }

  .error-icon {
    font-size: 48px;
    margin-bottom: 24px;
  }

  .error-title {
    font-size: 24px;
    font-weight: 600;
    color: var(--text-primary, #F2F2F7);
    margin-bottom: 16px;
  }

  .error-message {
    font-size: 16px;
    color: var(--text-secondary, #C7C7CC);
    margin-bottom: 32px;
    line-height: 1.5;
  }

  .error-actions {
    display: flex;
    gap: 16px;
    justify-content: center;
    margin-bottom: 16px;
  }

  .error-retry-info {
    font-size: 14px;
    color: var(--text-tertiary, #8E8E93);
    opacity: 0.8;
  }

  .button {
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .button--primary {
    background-color: var(--accent-blue, #00A3FF);
    color: white;
  }

  .button--primary:hover {
    background-color: var(--accent-blue-hover, #0089E0);
  }

  .button--secondary {
    background-color: var(--bg-secondary, #1C1C1D);
    color: var(--text-primary, #F2F2F7);
    border: 1px solid var(--border-primary, #38383A);
  }

  .button--secondary:hover {
    background-color: var(--bg-tertiary, #3A3A3C);
  }
</style>