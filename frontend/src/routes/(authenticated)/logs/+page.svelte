<script lang="ts">
  import { ActivityLogList, LogsLayout } from '$lib/components/logs';
  import { ReactiveActivityLog } from '$lib/models/reactive-activity-log';
  import AppLayout from '$lib/components/layout/AppLayout.svelte';

  // ReactiveRecord handles subscriptions internally
  const logsQuery = ReactiveActivityLog.includes(['user', 'client', 'job'])
    .orderBy('created_at', 'asc')
    .limit(500)
    .all();

  // Zero.js handles all retries and refreshes automatically
  // No manual retry logic needed - trust Zero's built-in resilience
</script>

<AppLayout>
  <LogsLayout title="System Activity Logs">
    <ActivityLogList
      logs={logsQuery.data || []}
      context="system"
      isLoading={logsQuery.isLoading}
      error={logsQuery.error}
    />
  </LogsLayout>
</AppLayout>
