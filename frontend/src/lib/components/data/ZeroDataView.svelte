<!--
  ZeroDataView - Simplified Data Loading Component
  
  Uses Zero.js native result.type instead of manual loading/error states.
  Trusts Zero's automatic error handling and removes unnecessary retry logic.
  
  Usage:
  <ZeroDataView query={myQuery}>
    <svelte:fragment slot="content" let:data>
      Your content here with {data}
    </svelte:fragment>
  </ZeroDataView>
-->

<script lang="ts">
  import type { Snippet } from 'svelte';
  import LoadingSkeleton from '$lib/components/ui/LoadingSkeleton.svelte';

  interface Props<T> {
    query: {
      data: T | T[] | null; // Raw data from ReactiveQuery
      resultType: 'loading' | 'complete' | 'error' | 'unknown';
      error: Error | null;
      isLoading?: boolean; // Optional fallback
    };
    displayData: T | T[] | null; // Filtered/processed data to actually display
    content: Snippet<[T | T[]]>;
    loading?: Snippet;
    error?: Snippet<[Error]>;
    empty?: Snippet;
    emptyMessage?: string;
    filteredEmptyMessage?: string;
  }

  let {
    query,
    displayData,
    content,
    loading,
    error: errorSnippet,
    empty,
    emptyMessage = 'No items found',
    filteredEmptyMessage = 'No items match your filters',
  }: Props<unknown> = $props();

  // Conservative state management - show loading for any loading indicator
  const isLoading = $derived(
    (query.isLoading ?? false) || // Internal loading flag
      query.resultType === 'loading' || // State machine loading
      query.resultType === 'unknown' // Initial state
  );

  const hasError = $derived(query.resultType === 'error' && query.error);

  // Automatically detect if this is a collection by checking if displayData is an array
  const isCollection = $derived(Array.isArray(displayData));

  // Conservative empty state logic - only when display data is definitively empty
  const isEmpty = $derived(
    query.resultType === 'complete' &&
      (isCollection ? Array.isArray(displayData) && displayData.length === 0 : displayData === null)
  );

  // Filtered empty state - raw data exists but display data is empty after filtering
  const isFilteredEmpty = $derived(
    query.resultType === 'complete' &&
      isCollection &&
      Array.isArray(query.data) &&
      query.data.length > 0 &&
      Array.isArray(displayData) &&
      displayData.length === 0
  );

  // Has data to display - only show content when we definitely have display data
  const hasData = $derived(
    query.resultType === 'complete' &&
      (isCollection ? Array.isArray(displayData) && displayData.length > 0 : displayData !== null)
  );
</script>

<!-- Loading State - Only when Zero says we're loading -->
{#if isLoading}
  {#if loading}
    {@render loading()}
  {:else}
    <LoadingSkeleton />
  {/if}

  <!-- Error State - Zero handles retries automatically, so this is rare -->
{:else if hasError}
  {#if errorSnippet && query.error}
    {@render errorSnippet(query.error)}
  {:else}
    <div class="error-state">
      <div class="error-content">
        <h2>Unable to load data</h2>
        <p>Please check your connection. Zero.js will automatically retry.</p>
        {#if query.error}
          <div class="error-details">
            <code>{query.error.message}</code>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- True Empty State - Only when Zero confirms no raw data exists -->
{:else if isEmpty}
  {#if empty}
    {@render empty()}
  {:else}
    <div class="empty-state">
      <div class="empty-state-icon">📋</div>
      <h2>{emptyMessage}</h2>
    </div>
  {/if}

  <!-- Filtered Empty State - Raw data exists but no matches after filtering -->
{:else if isFilteredEmpty}
  <div class="empty-state filtered-empty">
    <div class="empty-state-icon">🔍</div>
    <h2>{filteredEmptyMessage}</h2>
    <p>Try adjusting your filters or search criteria.</p>
  </div>

  <!-- Success State - Data is available -->
{:else if hasData}
  {@render content(displayData)}

  <!-- Fallback - Should rarely happen with Zero.js -->
{:else}
  <div class="unknown-state">
    <p>Waiting for data...</p>
  </div>
{/if}

<style>
  .error-state {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 200px;
    padding: 32px;
  }

  .error-content {
    text-align: center;
    max-width: 400px;
  }

  .error-content h2 {
    color: var(--text-primary, #1d1d1f);
    margin-bottom: 8px;
    font-size: 20px;
    font-weight: 600;
  }

  .error-content p {
    color: var(--text-secondary, #86868b);
    margin-bottom: 16px;
    line-height: 1.5;
  }

  .error-details {
    background: var(--background-secondary, #f2f2f7);
    border-radius: 8px;
    padding: 12px;
    margin-top: 16px;
  }

  .error-details code {
    font-family:
      SF Mono,
      Monaco,
      monospace;
    font-size: 14px;
    color: var(--text-primary, #1d1d1f);
    word-break: break-word;
  }

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

  .empty-state.filtered-empty {
    /* Slightly different styling for filtered empty state */
  }

  .empty-state.filtered-empty h2 {
    color: var(--text-secondary, #86868b);
    margin-bottom: 8px;
  }

  .empty-state.filtered-empty p {
    color: var(--text-tertiary, #98989d);
    font-size: 14px;
    margin: 0;
  }

  .unknown-state {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100px;
    padding: 16px;
  }

  .unknown-state p {
    color: var(--text-secondary, #86868b);
    font-style: italic;
  }
</style>
