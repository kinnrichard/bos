<script lang="ts">
  import { page } from '$app/stores';
  import { ActivityLogList } from '$lib/components/logs';
  import { ReactiveActivityLog } from '$lib/models/reactive-activity-log';
  import { ReactiveClient } from '$lib/models/reactive-client';
  
  $: clientId = $page.params.id;
  
  // Get client
  $: clientQuery = ReactiveClient.find(clientId);
  
  // Get client-specific logs
  $: logsQuery = ReactiveActivityLog
    .includes(['user', 'client', 'job'])
    .where({ client_id: clientId })
    .orderBy('created_at', 'desc')
    .limit(500)
    .all();
</script>

<div class="page-container">
  <div class="page-header">
    {#if clientQuery.data}
      <h1>Activity Log for {clientQuery.data.name}</h1>
      <p class="client-code">Client Code: {clientQuery.data.client_code}</p>
    {:else}
      <h1>Activity Log</h1>
    {/if}
  </div>
  
  {#if logsQuery.isLoading}
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading activity logs...</p>
    </div>
  {:else if logsQuery.error}
    <div class="error-container">
      <p>Error loading activity logs:</p>
      <p class="error-message">{logsQuery.error.message}</p>
    </div>
  {:else}
    <ActivityLogList logs={logsQuery.data} context="client" />
  {/if}
</div>

<style>
  .page-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  .page-header {
    margin-bottom: 2rem;
  }

  .page-header h1 {
    font-size: 2rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
  }

  .client-code {
    color: var(--text-secondary);
    font-size: 0.875rem;
  }

  .loading-container,
  .error-container {
    text-align: center;
    padding: 3rem 1rem;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    margin: 0 auto 1rem;
    border: 3px solid var(--border-primary);
    border-top-color: var(--accent-blue);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .error-container {
    color: var(--text-primary);
  }

  .error-message {
    color: var(--accent-red);
    margin-top: 0.5rem;
  }
</style>