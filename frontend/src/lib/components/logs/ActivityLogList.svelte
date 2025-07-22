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
    priority: number; // For sorting groups
    lastActivity: Date; // For recency sorting
  }

  let { 
    logs, 
    context = 'system',
    isLoading = false,
    error = null,
    onRetry
  }: Props = $props();

  // Enhanced grouping algorithm with duplicate detection and cross-references
  const groupedLogs = $derived(() => {
    // Step 1: Detect and group duplicate actions
    const processedLogs = detectDuplicateActions(logs);
    
    // Step 2: Create context groups
    const groups = new Map<string, LogGroup>();

    processedLogs.forEach(log => {
      const { groupKey, groupType, priority } = determineLogGroup(log);

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          key: groupKey,
          type: groupType,
          client: log.client,
          job: log.job,
          logs: [],
          isCollapsed: false,
          priority,
          lastActivity: new Date(log.created_at)
        });
      }

      const group = groups.get(groupKey)!;
      group.logs.push(log);
      
      // Update last activity time for recency sorting
      const logDate = new Date(log.created_at);
      if (logDate > group.lastActivity) {
        group.lastActivity = logDate;
      }
    });

    // Step 3: Enhanced sorting with priority and recency
    return Array.from(groups.values()).sort((a, b) => {
      // First by priority (lower number = higher priority)
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      
      // Then by most recent activity
      return b.lastActivity.getTime() - a.lastActivity.getTime();
    });
  });

  // Helper function to detect duplicate actions within time windows
  function detectDuplicateActions(logs: ActivityLogData[]): ActivityLogData[] {
    const duplicateWindow = 5 * 60 * 1000; // 5 minutes in milliseconds
    const duplicateGroups = new Map<string, ActivityLogData[]>();
    
    // Group potentially duplicate actions
    logs.forEach(log => {
      const actionKey = `${log.action}-${log.loggable_type}-${log.loggable_id}-${log.user_id}`;
      const logTime = new Date(log.created_at).getTime();
      
      // Find existing group within time window
      let foundGroup = false;
      for (const [key, group] of duplicateGroups) {
        if (key.startsWith(actionKey)) {
          const groupTime = new Date(group[0].created_at).getTime();
          if (Math.abs(logTime - groupTime) <= duplicateWindow) {
            group.push(log);
            foundGroup = true;
            break;
          }
        }
      }
      
      if (!foundGroup) {
        duplicateGroups.set(`${actionKey}-${logTime}`, [log]);
      }
    });
    
    // Process groups to mark duplicates
    const processedLogs: ActivityLogData[] = [];
    for (const group of duplicateGroups.values()) {
      if (group.length > 1) {
        // Keep the most recent log and mark it with duplicate count
        const sortedGroup = group.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const primaryLog = { ...sortedGroup[0] };
        
        // Add duplicate metadata
        primaryLog.metadata = {
          ...primaryLog.metadata,
          duplicateCount: group.length,
          duplicateTimespan: {
            start: sortedGroup[sortedGroup.length - 1].created_at,
            end: sortedGroup[0].created_at
          }
        };
        
        processedLogs.push(primaryLog);
      } else {
        processedLogs.push(group[0]);
      }
    }
    
    return processedLogs.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  // Helper function to determine group classification and priority
  function determineLogGroup(log: ActivityLogData): { groupKey: string; groupType: LogGroup['type']; priority: number } {
    // Cross-reference detection: actions that span multiple contexts
    const isCrossReference = log.metadata?.cross_reference || 
      (log.client_id && log.job_id && log.loggable_type !== 'Job' && log.loggable_type !== 'Client');
    
    if (isCrossReference) {
      return {
        groupKey: `cross-ref-${log.client_id}-${log.job_id}`,
        groupType: 'cross-reference',
        priority: 2 // Medium priority
      };
    }
    
    if (log.client_id && log.job_id) {
      return {
        groupKey: `job-${log.job_id}`,
        groupType: 'job',
        priority: 1 // High priority - most specific context
      };
    }
    
    if (log.client_id && !log.job_id) {
      return {
        groupKey: `client-${log.client_id}`,
        groupType: 'client',
        priority: 3 // Lower priority - broader context
      };
    }
    
    return {
      groupKey: 'general',
      groupType: 'general',
      priority: 4 // Lowest priority - system-wide actions
    };
  }

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