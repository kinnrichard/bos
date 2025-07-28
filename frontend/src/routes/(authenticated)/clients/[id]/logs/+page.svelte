<script lang="ts">
  import { page } from '$app/stores';
  import { ActivityLogList, LogsLayout } from '$lib/components/logs';
  import { ActivityLogModels } from '$lib/models/reactive-activity-log-v2';
  import { ReactiveClient } from '$lib/models/reactive-client';
  import AppLayout from '$lib/components/layout/AppLayout.svelte';

  $: clientId = $page.params.id;

  // Get client
  $: clientQuery = ReactiveClient.find(clientId);

  // Get client-specific logs with navigation-optimized model for better transitions
  $: logsQuery = ActivityLogModels.navigation.kept()
    .includes(['user', 'client', 'job'])
    .where({ client_id: clientId })
    .orderBy('created_at', 'asc')
    .limit(500)
    .all();

  // Zero.js handles all retries and refreshes automatically
  // ReactiveView provides flash prevention and enhanced state management
</script>

<svelte:head>
  <title>Activity Log for {clientQuery.data?.name || 'Client'} - bŏs</title>
</svelte:head>

<AppLayout currentClient={clientQuery.data}>
  <LogsLayout
    title="Activity Log for {clientQuery.data?.name || 'Client'}"
    subtitle={clientQuery.data?.client_code
      ? `Client Code: ${clientQuery.data.client_code}`
      : undefined}
  >
    <ActivityLogList
      {logsQuery}
      context="client"
      strategy="progressive"
    />
  </LogsLayout>
</AppLayout>
