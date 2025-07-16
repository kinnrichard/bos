<!--
  AppLoading Component
  
  System-level loading component for app initialization states.
  Used when waiting for Zero.js initialization, authentication checks, etc.
-->

<script lang="ts">
  interface Props {
    message?: string;
    showSpinner?: boolean;
  }
  
  let { 
    message = "Connecting to data...",
    showSpinner = true
  }: Props = $props();
</script>

<div class="app-loading">
  <div class="app-loading__content">
    {#if showSpinner}
      <div class="app-loading__spinner"></div>
    {/if}
    
    <div class="app-loading__message">
      {message}
    </div>
    
    <div class="app-loading__subtitle">
      Please wait while we initialize the system
    </div>
  </div>
</div>

<style>
  .app-loading {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--bg-black, #000);
    padding: 20px;
  }

  .app-loading__content {
    text-align: center;
    max-width: 400px;
  }

  .app-loading__spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(0, 163, 255, 0.2);
    border-top: 3px solid var(--accent-blue, #00A3FF);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 24px;
  }

  .app-loading__message {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary, #F2F2F7);
    margin-bottom: 8px;
  }

  .app-loading__subtitle {
    font-size: 14px;
    color: var(--text-secondary, #C7C7CC);
    opacity: 0.8;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .app-loading__spinner {
      animation: none;
      border: 3px solid var(--accent-blue, #00A3FF);
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .app-loading__spinner {
      border-width: 4px;
    }
  }
</style>