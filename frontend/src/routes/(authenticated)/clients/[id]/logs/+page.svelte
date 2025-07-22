<script lang="ts">
  import { page } from '$app/stores';
  import { ActivityLogList, LogsLayout } from '$lib/components/logs';
  import { ReactiveActivityLog } from '$lib/models/reactive-activity-log';
  import { ReactiveClient } from '$lib/models/reactive-client';
  import AppLayout from '$lib/components/layout/AppLayout.svelte';
  
  $: clientId = $page.params.id;
  
  // Get client
  $: clientQuery = ReactiveClient.find(clientId);
  
  // Get client-specific logs
  $: logsQuery = ReactiveActivityLog
    .includes(['user', 'client', 'job'])
    .where({ client_id: clientId })
    .orderBy('created_at', 'asc')
    .limit(500)
    .all();

  function handleRetry() {
    logsQuery.refresh();
  }
</script>

<AppLayout currentClient={clientQuery.data}>
  <LogsLayout 
    title="Activity Log for {clientQuery.data?.name || 'Client'}"
    subtitle={clientQuery.data?.client_code ? `Client Code: ${clientQuery.data.client_code}` : undefined}
  >
    <ActivityLogList 
      logs={logsQuery.data || []} 
      context="client" 
      isLoading={logsQuery.isLoading}
      error={logsQuery.error}
      onRetry={handleRetry}
    />
  </LogsLayout>
</AppLayout>

