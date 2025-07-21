<!--
  JobsLayout Component
  
  Shared layout wrapper for job listing pages.
  Provides consistent container styling and structure.
-->

<script lang="ts">
  import type { Snippet } from 'svelte';
  
  interface Props {
    children: Snippet;
    header?: Snippet;
  }
  
  let { children, header }: Props = $props();
</script>

<div class="jobs-container">
  {#if header}
    <div class="page-header">
      {@render header()}
    </div>
  {/if}
  
  <div class="jobs-content">
    {@render children()}
  </div>
</div>

<style>
  .jobs-container {
    padding: 0 24px 24px 24px;
    max-width: 1200px;
    margin: 0 auto;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .page-header {
    margin-bottom: 0;
    flex-shrink: 0;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }

  .jobs-content {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    padding-top: 24px;
  }

  /* Responsive layout */
  @media (max-width: 768px) {
    .jobs-container {
      padding: 16px;
    }

    .page-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;
    }
  }

  @media (max-width: 480px) {
    .jobs-container {
      padding: 12px;
    }
  }
</style>