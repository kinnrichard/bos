<script lang="ts">
  import type { PopulatedJob } from '$lib/types/job';

  export let job: PopulatedJob;
  export let showClient: boolean = true;

  $: statusEmoji = getStatusEmoji(job.attributes.status);
  $: priorityEmoji = getPriorityEmoji(job.attributes.priority);
  
  function getStatusEmoji(status: string): string {
    const emojiMap: Record<string, string> = {
      'open': '📝',
      'in_progress': '⚡',
      'waiting_for_customer': '⏳',
      'waiting_for_scheduled_appointment': '📅',
      'paused': '⏸️',
      'successfully_completed': '✅',
      'cancelled': '❌'
    };
    return emojiMap[status] || '📝';
  }
  
  function getPriorityEmoji(priority: string): string {
    const emojiMap: Record<string, string> = {
      'low': '⬇️',
      'normal': '',
      'high': '⬆️',
      'critical': '🔥',
      'proactive_followup': '🔄'
    };
    return emojiMap[priority] || '';
  }

  function getJobPath(job: PopulatedJob): string {
    // For now, we'll use a simple path - this can be updated when we implement routing
    return `/jobs/${job.id}`;
  }
</script>

<a 
  href={getJobPath(job)}
  class="job-card-inline"
  data-sveltekit-preload-data="hover"
>
  <!-- Status emoji -->
  <span class="job-status-emoji">{statusEmoji}</span>

  <!-- Client and job name section -->
  <span class="job-name-section">
    {#if showClient}
      <span class="client-name-prefix">{job.client.name}</span>
    {/if}
    <span class="job-name">{job.attributes.title}</span>
  </span>

  <!-- Right side items -->
  <span class="job-right-section">
    <!-- Priority emoji (if not normal) -->
    {#if job.attributes.priority !== 'normal' && priorityEmoji}
      <span class="job-priority-emoji">{priorityEmoji}</span>
    {/if}

    <!-- Technician avatars -->
    {#if job.technicians?.length > 0}
      <span class="technician-avatars">
        {#each job.technicians as technician}
          <span 
            class="technician-avatar" 
            style={technician.avatar_style || `background-color: var(--accent-blue);`}
          >
            {technician.initials}
          </span>
        {/each}
      </span>
    {/if}
  </span>
</a>

<style>
  /* 
   * Note: Most styling comes from the existing CSS classes in application.css
   * This just adds any Svelte-specific styles if needed
   */
  .job-card-inline {
    /* Ensure we maintain the inline layout from Rails */
    display: flex;
    align-items: center;
    padding: 12px 16px;
    margin-bottom: 8px;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 8px;
    color: var(--text-primary);
    text-decoration: none;
    transition: all 0.15s ease;
    cursor: pointer;
  }

  .job-card-inline:hover {
    background-color: var(--bg-tertiary);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .job-status-emoji {
    font-size: 16px;
    margin-right: 12px;
    flex-shrink: 0;
  }

  .job-name-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0; /* Allow text truncation */
  }

  .client-name-prefix {
    font-size: 12px;
    color: var(--text-tertiary);
    font-weight: 500;
  }

  .job-name {
    font-size: 14px;
    color: var(--text-primary);
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .job-right-section {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .job-priority-emoji {
    font-size: 14px;
  }

  .technician-avatars {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .technician-avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    font-size: 11px;
    font-weight: 600;
    color: #fff;
    text-transform: uppercase;
    line-height: 1;
    flex-shrink: 0;
    user-select: none;
    text-shadow: 0.5px 0.5px 2px rgba(0, 0, 0, 0.75);
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .job-card-inline {
      padding: 10px 12px;
    }
    
    .client-name-prefix {
      font-size: 11px;
    }
    
    .job-name {
      font-size: 13px;
    }
  }
</style>