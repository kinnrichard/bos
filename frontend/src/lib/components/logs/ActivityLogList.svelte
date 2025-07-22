<script lang="ts">
  import type { ActivityLogData } from '$lib/models/types/activity-log-data';
  import type { ClientData } from '$lib/models/types/client-data';
  import type { JobData } from '$lib/models/types/job-data';
  import ActivityLogGroup from './ActivityLogGroup.svelte';
  import ActivityLogEmpty from './ActivityLogEmpty.svelte';
  import ActivityLogDateHeader from './ActivityLogDateHeader.svelte';
  import ActivityLogRow from './ActivityLogRow.svelte';

  interface Props {
    logs: ActivityLogData[];
    context?: 'system' | 'client';
  }

  interface LogGroup {
    key: string;
    type: 'general' | 'client' | 'job' | 'cross-reference';
    client?: ClientData;
    job?: JobData;
    logs: ActivityLogData[];
    isCollapsed: boolean;
  }

  let { logs, context = 'system' }: Props = $props();

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
  {#if logs.length === 0}
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
</style>