<script lang="ts">
  import { createPopover } from 'svelte-headlessui';
  import { fade } from 'svelte/transition';
  import { currentJob } from '$lib/stores/layout';
  import { getJobStatusEmoji } from '$lib/config/emoji';

  const popover = createPopover();

  // Get job status emoji
  $: jobStatusEmoji = $currentJob ? getJobStatusEmoji($currentJob.attributes.status) : '📝';
</script>

<div class="job-status-popover">
  <button 
    class="job-status-button"
    use:popover.button
    title="Job Status"
  >
    <span class="job-status-emoji">{jobStatusEmoji}</span>
  </button>

  {#if $popover.expanded}
    <div 
      class="job-status-panel"
      use:popover.panel
      in:fade={{ duration: 0 }}
      out:fade={{ duration: 150 }}
    >
      <div class="job-status-content">
        <!-- Empty popover content for now -->
        <p class="placeholder-text">Job status options will go here</p>
      </div>
    </div>
  {/if}
</div>

<style>
  .job-status-popover {
    position: relative;
  }

  .job-status-button {
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
    position: relative;
  }

  .job-status-button:hover {
    background-color: var(--bg-tertiary);
    border-color: var(--accent-blue);
  }

  .job-status-emoji {
    font-size: 18px;
    line-height: 1;
  }

  .job-status-panel {
    position: absolute;
    top: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    width: 200px;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    z-index: var(--z-popover);
  }

  /* Arrow/tail pointing up to the button */
  .job-status-panel::before {
    content: '';
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 12px solid transparent;
    border-right: 12px solid transparent;
    border-bottom: 12px solid var(--border-primary);
  }

  .job-status-panel::after {
    content: '';
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-bottom: 10px solid var(--bg-secondary);
  }

  .job-status-content {
    padding: 16px;
  }

  .placeholder-text {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 0;
    text-align: center;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .job-status-panel {
      width: 180px;
    }
  }
</style>