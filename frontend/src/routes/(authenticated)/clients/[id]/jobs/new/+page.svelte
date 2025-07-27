<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { ReactiveClient } from '$lib/models/reactive-client';
  import { Job } from '$lib/models/job';
  import JobDetailView from '$lib/components/jobs/JobDetailView.svelte';
  import AppLayout from '$lib/components/layout/AppLayout.svelte';
  import LoadingSkeleton from '$lib/components/ui/LoadingSkeleton.svelte';
  import { toastStore } from '$lib/stores/toast.svelte';

  // Extract client ID from URL
  const clientId = $derived($page.params.id);
  
  // Query for the client (for validation and sidebar)
  const clientQuery = $derived(clientId ? ReactiveClient.find(clientId) : null);
  const client = $derived(clientQuery?.data);
  const clientLoading = $derived(clientQuery?.isLoading ?? true);
  const clientError = $derived(clientQuery?.error);
  
  // Create mock job object for new job state
  const newJob = $derived({
    id: null, // Indicates this is a new job
    title: '',
    status: 'active',
    priority: 'medium',
    client_id: clientId,
    client: client,
    tasks: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  // Page title
  const pageTitle = $derived(
    client ? `New Job for ${client.name} - bŏs` : 'New Job - bŏs'
  );

  // Handle job title save (creation)
  async function handleJobTitleSave(newTitle: string) {
    const trimmedTitle = newTitle.trim();
    
    if (!trimmedTitle) {
      toastStore.error('Please give this job a name');
      return Promise.reject(new Error('Job title is required'));
    }
    
    try {
      const createdJob = await Job.create({
        title: trimmedTitle,
        client_id: clientId,
        status: 'active',
        priority: 'medium'
      });
      
      // Navigate to the newly created job
      goto(`/jobs/${createdJob.id}`);
      return createdJob;
    } catch (error) {
      console.error('Failed to create job:', error);
      toastStore.error('Failed to create job. Please try again.');
      throw error;
    }
  }

  // Handle cancel action
  function handleCancel() {
    goto(`/clients/${clientId}/jobs`);
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout currentClient={client} currentJob={newJob} toolbarDisabled={true}>
<div class="job-detail-container">
  
  <!-- Loading State -->
  {#if clientLoading}
    <div class="job-detail-loading">
      <LoadingSkeleton type="job-detail" />
    </div>

  <!-- Client Error State -->
  {:else if clientError}
    <div class="error-state">
      <div class="error-content">
        <h2>Client not found</h2>
        <p>The specified client could not be found.</p>
        <button 
          class="button button--primary"
          onclick={() => goto('/clients')}
        >
          Back to Clients
        </button>
      </div>
    </div>

  <!-- New Job Creation Interface -->
  {:else if client}
    <JobDetailView 
      job={newJob}
      keptTasks={[]}
      batchTaskDetails={undefined}
      isNewJobMode={true}
      onJobTitleSave={handleJobTitleSave}
      onCancel={handleCancel}
    />
  {/if}
</div>
</AppLayout>

<style>
  /* Reuse existing styles from /jobs/[id]/+page.svelte */
  .job-detail-container {
    padding: 3px 24px 0 24px;
    max-width: 1200px;
    margin: 0 auto;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .job-detail-loading {
    padding: 20px 0;
  }

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
    font-size: 24px;
  }

  .error-content p {
    color: var(--text-secondary);
    margin-bottom: 16px;
    line-height: 1.5;
  }

  .button {
    padding: 12px 24px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.15s ease;
    background: var(--accent-blue);
    color: white;
  }

  .button:hover {
    background: var(--accent-blue-hover);
  }
</style>