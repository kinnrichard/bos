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
      data: T | T[] | null;
      resultType: 'loading' | 'complete' | 'error';
      error: Error | null;
      isCollection?: boolean;
    };
    content: Snippet<[T | T[]]>;
    loading?: Snippet;
    error?: Snippet<[Error]>;
    empty?: Snippet;
    emptyMessage?: string;
  }

  let {
    query,
    content,
    loading,
    error: errorSnippet,
    empty,
    emptyMessage = 'No items found',
  }: Props<unknown> = $props();

  // Derived states based on Zero.js resultType
  const isLoading = $derived(query.resultType === 'loading');
  const hasError = $derived(query.resultType === 'error' && query.error);
  const isComplete = $derived(query.resultType === 'complete');
  const isEmpty = $derived(
    isComplete &&
      (query.isCollection
        ? Array.isArray(query.data) && query.data.length === 0
        : query.data === null)
  );
  const hasData = $derived(
    isComplete &&
      (query.isCollection
        ? Array.isArray(query.data) && query.data.length > 0
        : query.data !== null)
  );

  // Temporary debugging - will be removed after loading issue is resolved
  $effect(() => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('ZeroDataView state:', {
        resultType: query.resultType,
        isLoading,
        hasError,
        isComplete,
        isEmpty,
        hasData,
        dataLength: Array.isArray(query.data) ? query.data.length : 'not array',
        data: query.data,
      });
    }
  });
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

  <!-- Empty State - Only when Zero confirms data is complete but empty -->
{:else if isEmpty}
  {#if empty}
    {@render empty()}
  {:else}
    <div class="empty-state">
      <div class="empty-state-icon">📋</div>
      <h2>{emptyMessage}</h2>
    </div>
  {/if}

  <!-- Success State - Data is available -->
{:else if hasData}
  {@render content(query.data)}

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
