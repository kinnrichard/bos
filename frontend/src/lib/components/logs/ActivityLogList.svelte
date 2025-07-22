<script lang="ts">
  import type { ActivityLogData } from '$lib/models/types/activity-log-data';
  import type { ClientData } from '$lib/models/types/client-data';
  import type { JobData } from '$lib/models/types/job-data';
  import ActivityLogGroup from './ActivityLogGroup.svelte';
  import ActivityLogEmpty from './ActivityLogEmpty.svelte';
  import ActivityLogDateHeader from './ActivityLogDateHeader.svelte';
  import ActivityLogRow from './ActivityLogRow.svelte';
  import LoadingSkeleton from '$lib/components/ui/LoadingSkeleton.svelte';

  interface Props {
    logs: ActivityLogData[];
    context?: 'system' | 'client';
    isLoading?: boolean;
    error?: Error | null;
    onRetry?: () => void;
  }

  interface LogGroup {
    key: string;
    type: 'general' | 'client' | 'job' | 'cross-reference';
    client?: ClientData;
    job?: JobData;
    logs: ActivityLogData[];
    isCollapsed: boolean;
  }

  let { 
    logs, 
    context = 'system',
    isLoading = false,
    error = null,
    onRetry
  }: Props = $props();

  // Group logs by context (client/job combination)
  const groupedLogs = $derived(() => {
    const groups = new Map<string, LogGroup>();

    logs.forEach(log => {
      let groupKey: string;
      let groupType: LogGroup['type'];
      
      if (log.client_id && log.job_id) {
        groupKey = `job-${log.job_id}`;
        groupType = 'job';
      } else if (log.client_id && !log.job_id) {
        groupKey = `client-${log.client_id}`;
        groupType = 'client';
      } else {
        groupKey = 'general';
        groupType = 'general';
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          key: groupKey,
          type: groupType,
          client: log.client,
          job: log.job,
          logs: [],
          isCollapsed: false
        });
      }

      groups.get(groupKey)!.logs.push(log);
    });

    // Sort groups: general first, then by client name, then by job title
    return Array.from(groups.values()).sort((a, b) => {
      if (a.type === 'general' && b.type !== 'general') return -1;
      if (a.type !== 'general' && b.type === 'general') return 1;
      
      if (a.client?.name && b.client?.name) {
        const clientCompare = a.client.name.localeCompare(b.client.name);
        if (clientCompare !== 0) return clientCompare;
      }
      
      if (a.job?.title && b.job?.title) {
        return a.job.title.localeCompare(b.job.title);
      }
      
      return 0;
    });
  });

  // For now, show all logs in a simple list within groups
  // Full date grouping will be implemented in Phase 3
</script>

<div class="activity-log-list">
  {#if isLoading}
    <LoadingSkeleton type="generic" count={8} />
  {:else if error}
    <div class="error-state">
      <div class="error-content">
        <h2>Unable to load activity logs</h2>
        <p>There was a problem loading the activity logs. Please try again.</p>
        <div class="error-details">
          <code>{error.message}</code>
        </div>
        {#if onRetry}
          <button 
            class="button button--primary"
            onclick={onRetry}
          >
            Try Again
          </button>
        {/if}
      </div>
    </div>
  {:else if logs.length === 0}
    <ActivityLogEmpty {context} />
  {:else}
    {#each groupedLogs() as group (group.key)}
      <ActivityLogGroup
        groupType={group.type}
        client={group.client}
        job={group.job}
        logs={group.logs}
        isCollapsed={group.isCollapsed}
      />
    {/each}
  {/if}
</div>

<style>
  .activity-log-list {
    padding: 1rem;
    max-width: 100%;
  }

  /* Error State */
  .error-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    padding: 40px 20px;
  }

  .error-content {
    text-align: center;
    max-width: 400px;
  }

  .error-content h2 {
    color: var(--text-primary);
    margin-bottom: 12px;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .error-content p {
    color: var(--text-secondary);
    margin-bottom: 16px;
    line-height: 1.5;
  }

  .error-details {
    margin-bottom: 20px;
    padding: 12px;
    background-color: var(--bg-tertiary);
    border-radius: 6px;
    border: 1px solid var(--border-primary);
  }

  .error-details code {
    color: var(--accent-red);
    font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace;
    font-size: 0.875rem;
  }

  .button {
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .button--primary {
    background-color: var(--accent-blue);
    color: white;
  }

  .button--primary:hover {
    background-color: var(--accent-blue-hover, #0089E0);
  }
</style>