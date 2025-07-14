<script lang="ts">
  import BasePopover from './BasePopover.svelte';

  // Props matching original BasePopoverButton API
  let {
    title,
    error = '',
    loading = false,
    panelWidth = '240px',
    panelPosition = 'center' as 'center' | 'right',
    topOffset = '12px', // Not used in new system but kept for compatibility
    contentPadding = '16px',
    buttonClass = '',
    popover = $bindable()
  } = $props();

  // Convert panelPosition to preferred placement
  const preferredPlacement = $derived(panelPosition === 'center' ? 'bottom' : 'bottom' as 'top' | 'bottom' | 'left' | 'right');
</script>

<BasePopover 
  {preferredPlacement}
  {panelWidth}
>
  <svelte:fragment slot="trigger" let:popover>
    <button 
      type="button"
      class="popover-button {buttonClass}"
      use:popover.button
      {title}
      onclick={(e) => e.stopPropagation()}
    >
      <slot name="button-content" />
    </button>
  </svelte:fragment>

  <div class="panel-content" style="padding: {contentPadding};">
    <slot name="panel-content" {error} {loading} />
  </div>
</BasePopover>

<style>
  .popover-button {
    width: 36px;
    height: 36px;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
    padding: 0;
    pointer-events: auto !important;
    position: relative;
    z-index: 10;
  }

  .popover-button:hover {
    background-color: var(--bg-tertiary);
    border-color: var(--accent-blue);
  }

  /* Panel content padding handled by style props */

  /* Accessibility improvements */
  @media (prefers-reduced-motion: reduce) {
    .popover-button {
      transition: none;
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .popover-button {
      border-width: 2px;
    }
  }
</style>