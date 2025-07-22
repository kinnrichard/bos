<script lang="ts">
  import { ActivityLogList, LogsLayout } from '$lib/components/logs';
  import { ReactiveActivityLog } from '$lib/models/reactive-activity-log';
  import AppLayout from '$lib/components/layout/AppLayout.svelte';
  
  // ReactiveRecord handles subscriptions internally
  const logsQuery = ReactiveActivityLog
    .includes(['user', 'client', 'job'])
    .orderBy('created_at', 'desc')
    .limit(500)
    .all();

  function handleRetry() {
    logsQuery.refresh();
  }
</script>

<AppLayout>
  <LogsLayout title="System Activity Logs">
    <ActivityLogList 
      logs={logsQuery.data || []} 
      context="system" 
      isLoading={logsQuery.isLoading}
      error={logsQuery.error}
      onRetry={handleRetry}
    />
  </LogsLayout>
</AppLayout>

