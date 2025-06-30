<script lang="ts">
  import type { PageData } from './$types';
  import AppLayout from '$lib/components/layout/AppLayout.svelte';
  import ClientInfo from '$lib/components/jobs/ClientInfo.svelte';

  export let data: PageData;
  
  $: client = data.client;
</script>

<svelte:head>
  <title>{client.attributes.name} - Client Details</title>
</svelte:head>

<AppLayout>
<div class="client-page">
  <div class="page-header">
    <h1 class="page-title">Client Details</h1>
    <nav class="breadcrumb">
      <a href="/jobs" class="breadcrumb-link">Jobs</a>
      <span class="breadcrumb-separator">→</span>
      <span class="breadcrumb-current">{client.attributes.name}</span>
    </nav>
  </div>

  <div class="client-content">
    <ClientInfo client={client} />
  </div>
</div>
</AppLayout>

<style>
  .client-page {
    display: flex;
    flex-direction: column;
    gap: 32px;
    max-width: 800px;
    margin: 0 auto;
    padding: 24px;
  }

  .page-header {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .page-title {
    font-size: 32px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
  }

  .breadcrumb-link {
    color: var(--accent-blue);
    text-decoration: none;
    transition: opacity 0.15s ease;
  }

  .breadcrumb-link:hover {
    opacity: 0.8;
  }

  .breadcrumb-separator {
    color: var(--text-tertiary);
  }

  .breadcrumb-current {
    color: var(--text-secondary);
    font-weight: 500;
  }

  .client-content {
    display: flex;
    flex-direction: column;
  }

  /* Responsive layout */
  @media (max-width: 768px) {
    .client-page {
      padding: 16px;
      gap: 24px;
    }

    .page-title {
      font-size: 28px;
    }
  }

  @media (max-width: 480px) {
    .client-page {
      padding: 12px;
    }

    .page-title {
      font-size: 24px;
    }

    .breadcrumb {
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }

    .breadcrumb-separator {
      display: none;
    }
  }
</style>