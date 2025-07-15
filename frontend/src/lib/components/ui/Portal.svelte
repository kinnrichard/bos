<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';

  // Portal props
  let {
    target = 'body' as HTMLElement | string,
    enabled = true
  } = $props();

  let portalContainer = $state<HTMLElement>();
  let targetElement = $state<HTMLElement>();
  let contentElement = $state<HTMLElement>();

  onMount(() => {
    // Resolve target element
    if (typeof target === 'string') {
      if (target === 'body') {
        targetElement = document.body;
      } else {
        const element = document.querySelector(target);
        if (element instanceof HTMLElement) {
          targetElement = element;
        } else {
          console.warn(`Portal target "${target}" not found, falling back to body`);
          targetElement = document.body;
        }
      }
    } else {
      targetElement = target;
    }

    // Create a container element for this portal
    portalContainer = document.createElement('div');
    portalContainer.classList.add('portal-container');
  });

  onDestroy(() => {
    unmountPortal();
  });

  function mountPortal() {
    if (portalContainer && targetElement && contentElement) {
      if (!portalContainer.parentElement) {
        targetElement.appendChild(portalContainer);
      }
      // Move the content element to the portal container
      portalContainer.appendChild(contentElement);
    }
  }

  function unmountPortal() {
    if (portalContainer && portalContainer.parentElement) {
      portalContainer.parentElement.removeChild(portalContainer);
    }
  }

  // React to enabled changes
  $effect(() => {
    if (enabled && contentElement) {
      tick().then(() => mountPortal());
    } else if (!enabled) {
      unmountPortal();
    }
  });
</script>

{#if enabled}
  <div bind:this={contentElement} style="display: contents;">
    <slot />
  </div>
{:else}
  <slot />
{/if}

<style>
  :global(.portal-container) {
    /* Ensure portal containers don't interfere with layout */
    position: absolute;
    top: 0;
    left: 0;
    z-index: 9999;
    pointer-events: none;
  }

  :global(.portal-container > *) {
    /* Allow portal content to receive pointer events */
    pointer-events: auto;
  }
</style>