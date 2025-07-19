<script lang="ts">
  let {
    type = 'text' as 'text' | 'spinner' | 'dots' | 'skeleton',
    size = 'normal' as 'small' | 'normal' | 'large',
    message = 'Loading...',
    color = 'tertiary' as 'primary' | 'secondary' | 'tertiary',
    center = false,
    inline = false,
    customClass = '',
    // Show/hide state
    visible = true
  } = $props();

  // Size configurations
  const sizeConfig = {
    small: { fontSize: '11px', spinnerSize: '16px', dotSize: '4px' },
    normal: { fontSize: '12px', spinnerSize: '20px', dotSize: '6px' },
    large: { fontSize: '14px', spinnerSize: '24px', dotSize: '8px' }
  };

  const config = $derived(sizeConfig[size]);
</script>

{#if visible}
  <div 
    class="loading-indicator {type} {size} {color} {customClass}"
    class:center
    class:inline
    data-testid="loading-spinner"
    style:font-size={config.fontSize}
  >
    {#if type === 'text'}
      <span class="loading-text">{message}</span>
    {:else if type === 'spinner'}
      <div 
        class="spinner"
        style:width={config.spinnerSize}
        style:height={config.spinnerSize}
        aria-label={message}
      >
        <svg viewBox="0 0 24 24" fill="none">
          <circle 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            stroke-width="2" 
            stroke-linecap="round"
            stroke-dasharray="31.416"
            stroke-dashoffset="31.416"
          >
            <animate 
              attributeName="stroke-dasharray" 
              dur="2s" 
              values="0 31.416;15.708 15.708;0 31.416;0 31.416" 
              repeatCount="indefinite"
            />
            <animate 
              attributeName="stroke-dashoffset" 
              dur="2s" 
              values="0;-15.708;-31.416;-31.416" 
              repeatCount="indefinite"
            />
          </circle>
        </svg>
      </div>
      {#if message && message !== 'Loading...'}
        <span class="loading-text">{message}</span>
      {/if}
    {:else if type === 'dots'}
      <div class="dots-container" aria-label={message}>
        <div 
          class="dot"
          style:width={config.dotSize}
          style:height={config.dotSize}
        ></div>
        <div 
          class="dot"
          style:width={config.dotSize}
          style:height={config.dotSize}
        ></div>
        <div 
          class="dot"
          style:width={config.dotSize}
          style:height={config.dotSize}
        ></div>
      </div>
      {#if message && message !== 'Loading...'}
        <span class="loading-text">{message}</span>
      {/if}
    {:else if type === 'skeleton'}
      <div class="skeleton-container" aria-label={message}>
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .loading-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    line-height: 1.3;
  }

  .loading-indicator.center {
    justify-content: center;
    text-align: center;
  }

  .loading-indicator.inline {
    display: inline-flex;
  }

  /* Color variants */
  .loading-indicator.primary {
    color: var(--text-primary);
  }

  .loading-indicator.secondary {
    color: var(--text-secondary);
  }

  .loading-indicator.tertiary {
    color: var(--text-tertiary);
  }

  /* Text loading */
  .loading-text {
    font-size: inherit;
    color: inherit;
  }

  /* Spinner loading */
  .spinner {
    flex-shrink: 0;
    animation: spin 1s linear infinite;
  }

  .spinner svg {
    width: 100%;
    height: 100%;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* Dots loading */
  .dots-container {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .dot {
    background-color: currentColor;
    border-radius: 50%;
    animation: dot-bounce 1.4s ease-in-out infinite both;
  }

  .dot:nth-child(1) {
    animation-delay: -0.32s;
  }

  .dot:nth-child(2) {
    animation-delay: -0.16s;
  }

  .dot:nth-child(3) {
    animation-delay: 0s;
  }

  @keyframes dot-bounce {
    0%, 80%, 100% {
      transform: scale(0.7);
      opacity: 0.5;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  }

  /* Skeleton loading */
  .skeleton-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }

  .skeleton-line {
    height: 12px;
    background: linear-gradient(
      90deg,
      var(--bg-tertiary) 25%,
      var(--bg-quaternary) 50%,
      var(--bg-tertiary) 75%
    );
    background-size: 200% 100%;
    border-radius: 4px;
    animation: skeleton-loading 1.5s ease-in-out infinite;
  }

  .skeleton-line.short {
    width: 60%;
    height: 10px;
  }

  @keyframes skeleton-loading {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }

  /* Size variants */
  .loading-indicator.small {
    gap: 6px;
  }

  .loading-indicator.large {
    gap: 10px;
  }

  .loading-indicator.small .dots-container {
    gap: 3px;
  }

  .loading-indicator.large .dots-container {
    gap: 5px;
  }

  .loading-indicator.small .skeleton-container {
    gap: 6px;
  }

  .loading-indicator.large .skeleton-container {
    gap: 10px;
  }

  .loading-indicator.small .skeleton-line {
    height: 10px;
  }

  .loading-indicator.large .skeleton-line {
    height: 14px;
  }

  .loading-indicator.small .skeleton-line.short {
    height: 8px;
  }

  .loading-indicator.large .skeleton-line.short {
    height: 12px;
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation: none;
    }

    .dot {
      animation: none;
      opacity: 0.7;
    }

    .skeleton-line {
      animation: none;
      background: var(--bg-tertiary);
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .skeleton-line {
      background: var(--bg-quaternary);
      border: 1px solid var(--border-primary);
    }
  }
</style>