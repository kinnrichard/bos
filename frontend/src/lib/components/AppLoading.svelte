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

  let { message = 'Connecting to data...', showSpinner = true }: Props = $props();
</script>

<div class="app-loading">
  <div class="app-loading__content">
    {#if showSpinner}
      <div class="app-loading__spinner">
        <img src="/icons/progress.indicator.svg" alt="" />
      </div>
    {/if}

    <div class="app-loading__message">
      {message}
    </div>

    <div class="app-loading__subtitle">Please wait while we initialize the system</div>
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
    width: 32px;
    height: 32px;
    animation: progress-rotate 1s steps(8, end) infinite;
    margin: 0 auto 24px;

    img {
      width: 100%;
      height: 100%;
      display: block;
    }
  }

  .app-loading__message {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary, #f2f2f7);
    margin-bottom: 8px;
  }

  .app-loading__subtitle {
    font-size: 14px;
    color: var(--text-secondary, #c7c7cc);
    opacity: 0.8;
  }

  @keyframes progress-rotate {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .app-loading__spinner {
      animation: none;
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .app-loading__spinner {
      border-width: 4px;
    }
  }
</style>
