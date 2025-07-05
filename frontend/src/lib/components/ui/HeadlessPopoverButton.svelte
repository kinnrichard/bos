<script lang="ts">
  import BasePopover from './BasePopover.svelte';

  // Props matching original BasePopoverButton API
  export let title: string;
  export let error: string = '';
  export let loading: boolean = false;
  export let panelWidth: string = '240px';
  export let panelPosition: 'center' | 'right' = 'center';
  export let topOffset: string = '12px'; // Not used in new system but kept for compatibility
  export let contentPadding: string = '16px';
  export let buttonClass: string = '';

  // Convert panelPosition to preferred placement
  $: preferredPlacement = panelPosition === 'center' ? 'bottom' : 'bottom';

  // Forward popover instance from BasePopover
  let basePopover: any;
  export { basePopover as popover };
</script>

<BasePopover 
  bind:popover={basePopover}
  {preferredPlacement}
  {panelWidth}
>
  <svelte:fragment slot="trigger" let:popover>
    <button 
      type="button"
      class="popover-button {buttonClass}"
      use:popover.button
      {title}
      on:click|stopPropagation
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

  .panel-content {
    /* Padding set via style prop for flexibility */
  }

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