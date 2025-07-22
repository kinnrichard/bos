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
  
  let tableContainer: HTMLElement;
  let groupStates = $state<Record<string, boolean>>({});

  // Helper function to toggle group collapse state
  function toggleGroup(group: LogGroup) {
    groupStates[group.key] = !(groupStates[group.key] ?? true);
  }

  // Helper function to get group collapsed state
  function isGroupCollapsed(groupKey: string): boolean {
    return groupStates[groupKey] ?? true; // Default to collapsed
  }

  // Helper function to get group header CSS class
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

  // Helper function to render group title
  function renderGroupTitle(group: LogGroup) {
    switch (group.type) {
      case 'client':
        return `👤 ${group.client?.name || 'Unknown Client'}`;
      case 'job':
        return `💼 ${group.client?.name || 'Unknown Client'} - ${group.job?.title || 'Unknown Job'}`;
      case 'cross-reference':
        return `🔗 ${group.client?.name || 'Unknown Client'} - ${group.job?.title || 'Unknown Job'} (Cross-reference)`;
      case 'general':
        return '⚙️ General Activity';
      default:
        return 'Activity';
    }
  }

  // Helper function to group logs by date
  function getLogsByDate(logs: ActivityLogData[]): [string, ActivityLogData[]][] {
    const dateGroups = new Map<string, ActivityLogData[]>();
    
    logs.forEach(log => {
      const date = new Date(log.created_at);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      if (!dateGroups.has(dateKey)) {
        dateGroups.set(dateKey, []);
      }
      dateGroups.get(dateKey)!.push(log);
    });
    
    // Sort by date descending (most recent first)
    return Array.from(dateGroups.entries()).sort(([a], [b]) => b.localeCompare(a));
  }

  // Helper function to format date headers
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
        day: 'numeric' 
      });
    }
  }

  // Helper function to format log messages with rich content matching Rails logic
  function formatLogMessage(log: ActivityLogData): string {
    const loggableTypeEmoji = getLoggableTypeEmoji(log.loggable_type);
    const loggableName = getLoggableName(log);
    const metadata = log.metadata || {};
    
    switch (log.action) {
      case 'created':
        return `created ${loggableTypeEmoji} ${loggableName}`;
        
      case 'viewed':
        return `viewed ${loggableTypeEmoji} ${loggableName}`;
        
      case 'renamed':
        const oldName = metadata.old_name || 'Unknown';
        const newName = metadata.name || loggableName;
        return `renamed ${oldName} to ${newName}`;
        
      case 'updated':
        if (metadata.changes) {
          // Filter out unimportant attributes
          const filteredChanges = Object.fromEntries(
            Object.entries(metadata.changes).filter(([field]) => 
              !['position', 'lock_version', 'reordered_at', 'parent_id'].includes(field)
            )
          );
          
          const changeKeys = Object.keys(filteredChanges);
          
          if (changeKeys.length === 0) {
            return null; // Hide unimportant updates
          }
          
          // Handle special field changes
          if (changeKeys.length === 1 && changeKeys[0] === 'priority') {
            const [, newPriority] = filteredChanges.priority;
            const priorityEmoji = getPriorityEmoji(newPriority);
            return `marked ${loggableTypeEmoji} ${loggableName} as ${priorityEmoji} ${newPriority?.charAt(0)?.toUpperCase() + newPriority?.slice(1)} Priority`;
          }
          
          if (changeKeys.length === 1 && changeKeys[0] === 'assigned_to_id') {
            const [oldId, newId] = filteredChanges.assigned_to_id;
            if (!newId) {
              return `unassigned ${loggableTypeEmoji} ${loggableName}`;
            } else {
              // Look up user name from metadata or use fallback
              const assignedToName = metadata.assigned_to || `user #${newId}`;
              return `assigned ${loggableTypeEmoji} ${loggableName} to ${assignedToName}`;
            }
          }
          
          // Format other changes
          const changesText = changeKeys.map(field => {
            const [oldValue, newValue] = filteredChanges[field];
            return `${field}: ${oldValue} → ${newValue}`;
          }).join(', ');
          
          return `updated ${loggableName}: ${changesText}`;
        }
        return `updated ${loggableTypeEmoji} ${loggableName}`;
        
      case 'deleted':
        return `deleted ${loggableTypeEmoji} ${loggableName}`;
        
      case 'assigned':
        const assignedTo = metadata.assigned_to || 'someone';
        return `assigned ${loggableTypeEmoji} ${loggableName} to ${assignedTo}`;
        
      case 'unassigned':
        const unassignedFrom = metadata.unassigned_from || 'someone';
        return `unassigned ${unassignedFrom} from ${loggableTypeEmoji} ${loggableName}`;
        
      case 'status_changed':
        const newStatusLabel = metadata.new_status_label || metadata.new_status || 'Unknown';
        const statusEmoji = getStatusEmoji(metadata.new_status);
        return `set ${loggableTypeEmoji} ${loggableName} to ${statusEmoji} ${newStatusLabel}`;
        
      case 'added':
        const parentType = metadata.parent_type || 'container';
        const parentName = metadata.parent_name || 'Unknown';
        return `added ${loggableTypeEmoji} ${loggableName} to ${parentType} ${parentName}`;
        
      case 'logged_in':
        return 'signed into bŏs';
        
      case 'logged_out':
        return 'signed out of bŏs';
        
      default:
        return `${log.action} ${loggableName}`;
    }
  }
  
  // Helper function to get emoji for loggable types
  function getLoggableTypeEmoji(loggableType: string): string {
    switch (loggableType) {
      case 'Client':
        return '🏢'; // Could be 🏠 for residential, but we'd need the client data
      case 'Job':
        return '💼';
      case 'Task':
        return '☑️';
      case 'Person':
        return '👤';
      default:
        return '';
    }
  }
  
  // Helper function to get loggable name
  function getLoggableName(log: ActivityLogData): string {
    const metadata = log.metadata || {};
    
    if (metadata.name) {
      return metadata.name;
    }
    
    // Try to get name from the related objects
    switch (log.loggable_type) {
      case 'Client':
        return log.client?.name || 'Unknown Client';
      case 'Job':
        return log.job?.title || 'Unknown Job';
      case 'Task':
        return metadata.title || 'Unknown Task';
      case 'Person':
        const personName = metadata.person_name || 'Unknown Person';
        const clientName = log.client?.name || 'Unknown Client';
        const clientEmoji = log.client?.business ? '🏢' : '🏠';
        return `${personName} with ${clientEmoji} ${clientName}`;
      default:
        return log.loggable_type || 'Unknown';
    }
  }
  
  // Helper function to get priority emoji
  function getPriorityEmoji(priority: string): string {
    switch (priority?.toLowerCase()) {
      case 'high':
      case 'urgent':
        return '🔴';
      case 'medium':
      case 'normal':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return '⚪';
    }
  }
  
  // Helper function to get status emoji
  function getStatusEmoji(status: string): string {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'done':
        return '✅';
      case 'in_progress':
      case 'working':
        return '🔄';
      case 'pending':
      case 'waiting':
        return '⏳';
      case 'cancelled':
      case 'canceled':
        return '❌';
      case 'on_hold':
        return '⏸️';
      default:
        return '📋';
    }
  }

  // Helper function to check if log has duplicates
  function hasDuplicates(log: ActivityLogData): boolean {
    return !!(log.metadata?.duplicateCount && log.metadata.duplicateCount > 1);
  }

  // Helper function to get duplicate count
  function getDuplicateCount(log: ActivityLogData): number {
    return log.metadata?.duplicateCount || 1;
  }

  // Helper function to format timestamps
  function formatTimestamp(createdAt: string): string {
    const date = new Date(createdAt);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }

  // Auto-scroll to bottom on mount to show most recent activity
  $effect(() => {
    if (tableContainer && logs.length > 0) {
      requestAnimationFrame(() => {
        tableContainer.scrollTop = tableContainer.scrollHeight;
      });
    }
  });

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
          priority,
          lastActivity: new Date(log.created_at)
        });
        
        // Initialize collapsed state
        if (!(groupKey in groupStates)) {
          groupStates[groupKey] = true;
        }
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

<div class="logs-container">
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
    <div class="logs-table-container" bind:this={tableContainer}>
      <table class="logs-table">
        <tbody>
          {#each groupedLogs() as group (group.key)}
            <!-- Group header row -->
            <tr class="logs-group-header {getGroupHeaderClass(group.type)} {group.isCollapsed ? 'logs-group--collapsed' : ''}"
                onclick={() => toggleGroup(group)}>
              <td colspan="3">
                <div class="logs-group-header-content">
                  <span class="logs-group-toggle">
                    <img 
                      src="/icons/chevron-right.svg" 
                      alt={group.isCollapsed ? "Expand" : "Collapse"}
                      class="chevron-icon"
                      class:expanded={!isGroupCollapsed(group.key)}
                      width="8" 
                      height="12" 
                    />
                  </span>
                  
                  <span class="logs-group-title">{renderGroupTitle(group)}</span>
                  
                  <span class="logs-group-count">({group.logs.length})</span>
                </div>
              </td>
            </tr>

            {#if !isGroupCollapsed(group.key)}
              {#each getLogsByDate(group.logs) as [dateKey, dateLogs]}
                <!-- Date header row -->
                <tr class="logs-table__date-header logs-group-content">
                  <td class="logs-table__date-header-cell">
                    <span class="date-header-user">User</span>
                  </td>
                  <td class="logs-table__date-header-cell" colspan="2">
                    <div class="date-header-action-time">
                      <span class="date-header-action">Action</span>
                      <span class="date-header-time">{formatDateHeader(dateKey)}</span>
                    </div>
                  </td>
                </tr>
                
                <!-- Log entry rows -->
                {#each dateLogs as log, index (log.id)}
                  <tr class="logs-table__row logs-group-content" 
                      class:logs-table__row--alt={index % 2 === 1}>
                    <!-- User cell -->
                    <td class="logs-table__user-cell">
                      <div class="user-info">
                        {#if log.user}
                          <div class="user-avatar" style={log.user.avatar_style || 'background-color: var(--accent-blue);'}>
                            {log.user.initials || log.user.name?.charAt(0) || 'U'}
                          </div>
                          <span class="user-name">{log.user.name}</span>
                        {:else}
                          <div class="user-avatar" style="background-color: #8E8E93;">
                            S
                          </div>
                          <span class="user-name">System</span>
                        {/if}
                      </div>
                    </td>
                    
                    <!-- Action cell -->
                    <td class="logs-table__action-cell" colspan="2">
                      <div class="action-time-container">
                        <div class="action-content">
                          {#if formatLogMessage(log)}
                            {@html formatLogMessage(log)}
                            {#if hasDuplicates(log)}
                              <span class="log-count-badge">{getDuplicateCount(log)}×</span>
                            {/if}
                          {:else}
                            <em class="log-hidden">Update with minor changes</em>
                          {/if}
                        </div>
                        <div class="time-content">
                          <time datetime={log.created_at} title={new Date(log.created_at).toString()}>
                            {formatTimestamp(log.created_at)}
                          </time>
                        </div>
                      </div>
                    </td>
                  </tr>
                {/each}
              {/each}
            {/if}
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .logs-container {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .logs-table-container {
    flex: 1;
    overflow-y: auto;
    background-color: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: 8px;
  }

  .logs-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }

  /* Group header rows (Client/Job) */
  .logs-table :global(tr.logs-group-header) {
    position: sticky;
    top: -1px; /* Offset by -1px to prevent transparency gap */
    background-color: var(--bg-secondary);
    z-index: 9;
    cursor: pointer;
    user-select: none;
  }

  .logs-table :global(tr.logs-group-header:hover) {
    background-color: var(--bg-tertiary);
  }

  .logs-table :global(tr.logs-group-header.logs-group-header--general) {
    background-color: #1a2f3f; /* Solid blue-tinted background */
  }

  .logs-table :global(tr.logs-group-header.logs-group-header--cross-reference) {
    background-color: #3a2f1f; /* Solid orange-tinted background */
  }

  .logs-table :global(tr.logs-group-header td) {
    padding: 12px 16px;
    font-weight: 600;
    font-size: 14px;
    color: var(--text-primary);
    border-bottom: 2px solid var(--border-primary);
  }

  .logs-group-header-content {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .logs-group-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    color: var(--text-tertiary);
  }

  .chevron-icon {
    transition: transform 0.2s ease;
    color: var(--text-tertiary);
  }

  .chevron-icon.expanded {
    transform: rotate(90deg);
  }

  .logs-group-count {
    margin-left: auto;
    color: var(--text-tertiary);
    font-weight: 400;
    font-size: 13px;
  }

  /* Date header rows */
  .logs-table :global(tr.logs-table__date-header) {
    position: sticky;
    top: 39px; /* Positioned to overlap with group header border */
    background-color: var(--bg-secondary);
    z-index: 8;
  }

  .logs-table :global(td.logs-table__date-header-cell) {
    padding: 8px 16px;
    border-bottom: 1px solid var(--border-primary);
    font-weight: 600;
    font-size: 13px;
    color: var(--text-secondary);
    background-color: var(--bg-secondary); /* Ensure solid background */
  }

  .logs-table :global(td.logs-table__date-header-cell:first-child) {
    text-align: right;
    width: 140px; /* Match user cell width */
    white-space: nowrap;
  }

  .date-header-user {
    display: block;
  }

  .date-header-action-time {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .date-header-action {
    color: var(--text-secondary);
  }

  .date-header-time {
    color: var(--text-primary);
    font-weight: 600;
    white-space: nowrap;
    margin-left: 20px;
  }

  /* Log entry rows */
  .logs-table :global(tr.logs-table__row) {
    border-bottom: 1px solid var(--border-primary);
  }

  /* Alternating row colors */
  .logs-table :global(tr.logs-table__row--alt) {
    background-color: rgba(255, 255, 255, 0.02);
  }

  .logs-table :global(td) {
    padding: 8px 16px;
    vertical-align: top;
  }

  /* User cell styling */
  .logs-table :global(td.logs-table__user-cell) {
    white-space: nowrap;
    text-align: right;
    width: 140px; /* Fixed width to align with header */
  }

  .user-info {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
    vertical-align: baseline;
  }

  .user-avatar {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background-color: var(--accent-blue);
    color: white;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    font-weight: 600;
    flex-shrink: 0;
  }

  .user-name {
    color: var(--text-primary);
    font-weight: 500;
    line-height: 20px; /* Match avatar height for alignment */
  }

  /* Action cell styling */
  .logs-table :global(td.logs-table__action-cell) {
    color: var(--text-primary);
    line-height: 1.4;
  }

  .action-time-container {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
  }

  .action-content {
    flex: 1;
    min-width: 0; /* Allow text to wrap if needed */
  }

  .log-count-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background-color: var(--bg-tertiary);
    color: var(--text-secondary);
    font-weight: 600;
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 10px;
    margin-left: 8px;
    vertical-align: middle;
  }

  .log-hidden {
    color: var(--text-tertiary);
    font-style: italic;
    font-size: 13px;
  }

  .time-content {
    flex-shrink: 0;
    text-align: right;
    color: var(--text-tertiary);
    white-space: nowrap;
    font-size: 13px;
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