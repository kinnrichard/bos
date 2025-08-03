<!--
  Example: ActivityLogList with ReactiveRecord v2 Integration
  
  This demonstrates how to upgrade the existing ActivityLogList component
  to use ReactiveRecord v2 with flash prevention and improved state management.
  
  Key improvements:
  1. No more loading flashes when navigating between log views
  2. Stale data is preserved during refresh operations
  3. 5-state lifecycle provides better UX feedback
  4. Clean integration with existing component structure
-->

<script lang="ts">
  import type { ActivityLogData } from '$lib/models/types/activity-log-data';
  import type { ClientData } from '$lib/models/types/client-data';
  import type { JobData } from '$lib/models/types/job-data';
  import { ReactiveView } from '$lib/reactive';
  import { ActivityLogModels } from '$lib/models/reactive-activity-log-v2';
  import ActivityLogEmpty from '$lib/components/logs/ActivityLogEmpty.svelte';
  import LoadingSkeleton from '$lib/components/ui/LoadingSkeleton.svelte';
  import ActivityTypeEmoji from '$lib/components/ui/ActivityTypeEmoji.svelte';
  import { slide } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';

  interface Props {
    context?: 'system' | 'client';
    clientId?: string;
    jobId?: string;
    /** Use navigation-optimized model for page transitions */
    optimizeForNavigation?: boolean;
  }

  interface LogGroup {
    key: string;
    type: 'general' | 'client' | 'job' | 'cross-reference';
    client?: ClientData;
    job?: JobData;
    logs: ActivityLogData[];
    priority: number;
    lastActivity: Date;
  }

  let { context = 'system', clientId, jobId, optimizeForNavigation = false }: Props = $props();

  let tableContainer = $state<HTMLElement>();
  let groupStates = $state<Record<string, boolean>>({});

  // Choose the appropriate model based on context
  const ActivityLogModel = optimizeForNavigation
    ? ActivityLogModels.navigation
    : ActivityLogModels.standard;

  // Build query based on context
  function buildLogsQuery() {
    let query = ActivityLogModel.kept()
      .includes('user', 'client', 'job')
      .orderBy('created_at', 'desc');

    if (context === 'client' && clientId) {
      query = query.where({ client_id: clientId });
    } else if (jobId) {
      query = query.where({ job_id: jobId });
    }

    return query.all();
  }

  const logsQuery = buildLogsQuery();

  // Helper functions (same as original)
  function toggleGroup(group: LogGroup) {
    groupStates[group.key] = !(groupStates[group.key] ?? true);
  }

  function isGroupCollapsed(groupKey: string): boolean {
    return groupStates[groupKey] ?? true;
  }

  function getGroupHeaderClass(groupType: LogGroup['type']): string {
    switch (groupType) {
      case 'general':
        return 'logs-group-header--general';
      case 'cross-reference':
        return 'logs-group-header--cross-reference';
      default:
        return '';
    }
  }

  function getGroupTitleData(group: LogGroup): { type: LogGroup['type']; text: string } {
    let text: string;

    switch (group.type) {
      case 'client':
        text = `${group.client?.name || 'Unknown Client'}`;
        break;
      case 'job':
        text = `${group.job?.title || 'Unknown Job'} for ${group.client?.name || 'Unknown Client'}`;
        break;
      case 'cross-reference':
        text = `${group.job?.title || 'Unknown Job'} for ${group.client?.name || 'Unknown Client'}} (Cross-reference)`;
        break;
      case 'general':
        text = 'General Activity';
        break;
      default:
        text = 'Activity';
    }

    return { type: group.type, text };
  }

  function getLogsByDate(logs: ActivityLogData[]): [string, ActivityLogData[]][] {
    const dateGroups = new Map<string, ActivityLogData[]>();

    logs.forEach((log) => {
      const date = new Date(log.created_at);
      const dateKey = date.toISOString().split('T')[0];

      if (!dateGroups.has(dateKey)) {
        dateGroups.set(dateKey, []);
      }
      dateGroups.get(dateKey)!.push(log);
    });

    return Array.from(dateGroups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }

  function formatDateHeader(dateKey: string): string {
    const date = new Date(dateKey);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateKey === today.toISOString().split('T')[0]) {
      return 'Today';
    } else if (dateKey === yesterday.toISOString().split('T')[0]) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
  }

  // Group logs by context for better organization
  function groupLogsByContext(logs: ActivityLogData[]): LogGroup[] {
    const groups = new Map<string, LogGroup>();

    logs.forEach((log) => {
      let groupKey: string;
      let groupType: LogGroup['type'];
      let client = log.client;
      let job = log.job;
      let priority = 0;

      if (log.job_id && log.client_id) {
        groupKey = `job-${log.job_id}`;
        groupType = 'job';
        priority = 1;
      } else if (log.client_id) {
        groupKey = `client-${log.client_id}`;
        groupType = 'client';
        priority = 2;
      } else {
        groupKey = 'general';
        groupType = 'general';
        priority = 3;
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          key: groupKey,
          type: groupType,
          client,
          job,
          logs: [],
          priority,
          lastActivity: new Date(log.created_at),
        });
      }

      groups.get(groupKey)!.logs.push(log);

      // Update last activity time
      const logDate = new Date(log.created_at);
      if (logDate > groups.get(groupKey)!.lastActivity) {
        groups.get(groupKey)!.lastActivity = logDate;
      }
    });

    // Sort groups by priority, then by last activity
    return Array.from(groups.values()).sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return b.lastActivity.getTime() - a.lastActivity.getTime();
    });
  }
</script>

<!-- Use ReactiveView for clean state management -->
<ReactiveView query={logsQuery} strategy="progressive">
  {#snippet loading()}
    <div class="activity-logs-loading">
      <LoadingSkeleton />
      <p class="loading-text">Loading activity logs...</p>
    </div>
  {/snippet}

  {#snippet error({ error, refresh })}
    <div class="activity-logs-error">
      <h3>Failed to load activity logs</h3>
      <p>Error: {error?.message || 'Unknown error occurred'}</p>
      <button onclick={refresh} class="retry-button"> Try Again </button>
    </div>
  {/snippet}

  {#snippet empty()}
    <ActivityLogEmpty />
  {/snippet}

  {#snippet content({ data, isLoading, isFresh })}
    <div class="activity-logs-container" bind:this={tableContainer}>
      <!-- Show refresh indicator when data is being updated -->
      {#if isLoading && data.length > 0}
        <div class="refresh-indicator">
          <span class="refresh-icon">🔄</span>
          Refreshing logs...
        </div>
      {/if}

      <!-- Show data freshness indicator -->
      {#if !isFresh}
        <div class="stale-data-notice">
          <span class="warning-icon">⚠️</span>
          Showing cached data. <button onclick={() => logsQuery.refresh()}>Refresh</button>
        </div>
      {/if}

      {#each groupLogsByContext(data) as group (group.key)}
        <div class="logs-group" transition:slide={{ duration: 300, easing: quintOut }}>
          <!-- Group header -->
          <button
            class="logs-group-header {getGroupHeaderClass(group.type)}"
            onclick={() => toggleGroup(group)}
            type="button"
          >
            <div class="group-title">
              <span class="collapse-icon">
                {isGroupCollapsed(group.key) ? '▶' : '▼'}
              </span>
              <span class="group-name">{getGroupTitleData(group).text}</span>
              <span class="group-count">({group.logs.length})</span>
            </div>
            <div class="group-last-activity">
              Last activity: {group.lastActivity.toLocaleString()}
            </div>
          </button>

          <!-- Group content -->
          {#if !isGroupCollapsed(group.key)}
            <div class="logs-group-content" transition:slide={{ duration: 200 }}>
              {#each getLogsByDate(group.logs) as [dateKey, dateLogs] (dateKey)}
                <div class="date-group">
                  <h4 class="date-header">{formatDateHeader(dateKey)}</h4>

                  {#each dateLogs as log (log.id)}
                    <div class="activity-log-item" transition:slide={{ duration: 150 }}>
                      <div class="log-time">
                        {new Date(log.created_at).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>

                      <div class="log-content">
                        <div class="log-header">
                          <ActivityTypeEmoji type={log.activity_type} />
                          <span class="log-type">{log.activity_type}</span>
                          {#if log.user}
                            <span class="log-user">by {log.user.name}</span>
                          {/if}
                        </div>

                        <div class="log-description">
                          {log.description}
                        </div>

                        {#if log.details}
                          <div class="log-details">{log.details}</div>
                        {/if}
                      </div>
                    </div>
                  {/each}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/snippet}

  {#snippet loadingOverlay()}
    <div class="loading-overlay">
      <span class="loading-spinner">⟳</span>
      Updating...
    </div>
  {/snippet}
</ReactiveView>

<style>
  .activity-logs-container {
    position: relative;
  }

  .activity-logs-loading {
    padding: 2rem;
    text-align: center;
  }

  .loading-text {
    margin-top: 1rem;
    color: #6b7280;
    font-style: italic;
  }

  .activity-logs-error {
    padding: 2rem;
    text-align: center;
    border: 1px solid #ef4444;
    border-radius: 0.5rem;
    background-color: #fef2f2;
    color: #dc2626;
  }

  .retry-button {
    margin-top: 1rem;
    padding: 0.5rem 1.5rem;
    background-color: #dc2626;
    color: white;
    border: none;
    border-radius: 0.25rem;
    cursor: default;
    transition: background-color 0.2s;
  }

  .retry-button:hover {
    background-color: #b91c1c;
  }

  .refresh-indicator {
    position: absolute;
    top: -2rem;
    right: 0;
    padding: 0.5rem 1rem;
    background-color: rgba(59, 130, 246, 0.1);
    border: 1px solid #3b82f6;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    color: #3b82f6;
    z-index: 10;
  }

  .refresh-icon {
    animation: spin 1s linear infinite;
    margin-right: 0.5rem;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .stale-data-notice {
    padding: 0.75rem;
    margin-bottom: 1rem;
    background-color: #fef3c7;
    border: 1px solid #f59e0b;
    border-radius: 0.25rem;
    color: #92400e;
    font-size: 0.875rem;
  }

  .stale-data-notice button {
    background: none;
    border: none;
    color: #3b82f6;
    text-decoration: underline;
    cursor: default;
    padding: 0;
    margin-left: 0.25rem;
  }

  .logs-group {
    margin-bottom: 1.5rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .logs-group-header {
    padding: 1rem;
    background-color: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
    cursor: default;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: background-color 0.2s;
    width: 100%;
    border: none;
    text-align: left;
    font: inherit;
  }

  .logs-group-header:hover {
    background-color: #f3f4f6;
  }

  .logs-group-header--general {
    background-color: #f0f9ff;
  }

  .logs-group-header--cross-reference {
    background-color: #fefce8;
  }

  .group-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
  }

  .collapse-icon {
    width: 1rem;
    text-align: center;
    transition: transform 0.2s;
  }

  .group-count {
    color: #6b7280;
    font-weight: 400;
    font-size: 0.875rem;
  }

  .group-last-activity {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .logs-group-content {
    padding: 1rem;
  }

  .date-group {
    margin-bottom: 1.5rem;
  }

  .date-header {
    margin: 0 0 1rem 0;
    padding: 0.5rem 0;
    border-bottom: 1px solid #e5e7eb;
    font-size: 1rem;
    font-weight: 600;
    color: #374151;
  }

  .activity-log-item {
    display: flex;
    gap: 1rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid #f3f4f6;
  }

  .activity-log-item:last-child {
    border-bottom: none;
  }

  .log-time {
    flex-shrink: 0;
    width: 4rem;
    font-size: 0.875rem;
    color: #6b7280;
    font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', monospace;
  }

  .log-content {
    flex: 1;
  }

  .log-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .log-type {
    font-weight: 500;
    color: #374151;
    text-transform: capitalize;
  }

  .log-user {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .log-description {
    color: #4b5563;
    line-height: 1.5;
  }

  .log-details {
    margin-top: 0.25rem;
    font-size: 0.875rem;
    color: #6b7280;
    font-style: italic;
  }

  .loading-overlay {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background-color: rgba(255, 255, 255, 0.95);
    border: 1px solid #e5e7eb;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    color: #6b7280;
    position: absolute;
    top: 1rem;
    right: 1rem;
    z-index: 20;
  }

  .loading-spinner {
    animation: spin 1s linear infinite;
  }
</style>
