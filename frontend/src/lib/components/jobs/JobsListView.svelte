<!--
  JobsListView - Presentation component for job listings
  EP-0018: DRY Jobs Pages with Composable Architecture
  
  This component handles the presentation layer for job listings,
  integrating with ReactiveView and providing a consistent UI
  across all job listing contexts.
-->

<script lang="ts">
  import type { ReactiveQuery } from '$lib/models/base/types';
  import type { JobData } from '$lib/models/types/job-data';
  import type { Snippet } from 'svelte';
  import ReactiveView from '$lib/reactive/ReactiveView.svelte';
  import LoadingSkeleton from '$lib/components/ui/LoadingSkeleton.svelte';
  import JobCard from '$lib/components/jobs/JobCard.svelte';
  import JobsLayout from '$lib/components/jobs/JobsLayout.svelte';

  interface Props {
    /**
     * The reactive query to fetch jobs
     */
    query: ReactiveQuery<JobData[]>;

    /**
     * Optional display filter to apply to loaded jobs
     * Defaults to identity function (no filtering)
     */
    displayFilter?: (jobs: JobData[]) => JobData[];

    /**
     * Whether to show the client name in job cards
     * Defaults to true
     */
    showClient?: boolean;

    /**
     * Optional title for the page
     */
    title?: string;

    /**
     * Optional snippet for additional header content
     */
    headerContent?: Snippet;

    /**
     * Optional loading message
     */
    loadingMessage?: string;

    /**
     * Optional empty state message
     */
    emptyMessage?: string;

    /**
     * Optional empty state icon
     */
    emptyIcon?: string;

    /**
     * Optional no results message (when filtered results are empty)
     */
    noResultsMessage?: string;

    /**
     * Optional no results description
     */
    noResultsDescription?: string;

    /**
     * Optional no results icon
     */
    noResultsIcon?: string;

    /**
     * Loading strategy for ReactiveView
     */
    strategy?: 'progressive' | 'immediate';
  }

  let {
    query,
    displayFilter = (jobs) => jobs,
    showClient = true,
    title,
    headerContent,
    emptyMessage = 'No jobs found',
    emptyIcon = '💼',
    noResultsMessage = 'No jobs match your filters',
    noResultsDescription = 'Try adjusting your filters or search criteria.',
    noResultsIcon = '🔍',
    strategy = 'progressive',
  }: Props = $props();
</script>

<JobsLayout>
  {#snippet header()}
    {#if title}
      <h1>{title}</h1>
    {/if}
    {#if headerContent}
      {@render headerContent()}
    {/if}
  {/snippet}

  <ReactiveView {query} {strategy}>
    {#snippet loading()}
      <LoadingSkeleton type="job-card" count={6} />
    {/snippet}

    {#snippet error({ error, refresh })}
      <div class="error-state">
        <h2>Unable to load jobs</h2>
        <p>{error.message}</p>
        <button onclick={refresh} class="retry-button">Retry</button>
      </div>
    {/snippet}

    {#snippet empty()}
      <div class="empty-state">
        <div class="empty-state-icon">{emptyIcon}</div>
        <h2>{emptyMessage}</h2>
      </div>
    {/snippet}

    {#snippet content({ data })}
      {@const filteredJobs = displayFilter(data)}

      {#if filteredJobs.length === 0}
        <div class="empty-state">
          <div class="empty-state-icon">{noResultsIcon}</div>
          <h2>{noResultsMessage}</h2>
          {#if noResultsDescription}
            <p>{noResultsDescription}</p>
          {/if}
        </div>
      {:else}
        <div class="jobs-list">
          {#each filteredJobs as job (job.id)}
            <JobCard {job} {showClient} />
          {/each}
        </div>
      {/if}
    {/snippet}
  </ReactiveView>
</JobsLayout>

<style>
  /* Import shared styles */
  @import '$lib/styles/jobs-shared.scss';

  /* Jobs list container */
  .jobs-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* Error state */
  .error-state {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 200px;
    padding: 32px;
    text-align: center;
  }

  .error-state h2 {
    color: var(--text-primary);
    font-size: 20px;
    font-weight: 600;
    margin: 0 0 8px 0;
  }

  .error-state p {
    color: var(--text-secondary);
    font-size: 14px;
    margin: 0 0 16px 0;
  }

  .retry-button {
    padding: 8px 16px;
    background-color: var(--accent-blue);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: default;
    transition: background-color 0.2s ease;
  }

  .retry-button:hover {
    background-color: var(--accent-blue-hover, #0051d5);
  }

  /* Empty state */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    padding: 32px;
    text-align: center;
  }

  .empty-state-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.6;
  }

  .empty-state h2 {
    color: var(--text-secondary, #86868b);
    font-size: 18px;
    font-weight: 500;
    margin: 0;
  }

  .empty-state p {
    color: var(--text-tertiary, #98989d);
    font-size: 14px;
    margin: 8px 0 0 0;
  }
</style>
