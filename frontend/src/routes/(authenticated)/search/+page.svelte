<!--
  Search Results Page
  
  Displays client search results with a search input at the top
  Includes "New Client" option at the bottom of results
-->

<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { ReactiveQuery } from '$lib/zero/reactive-query-unified.svelte';
  import { getZero } from '$lib/zero';
  import AppLayout from '$lib/components/layout/AppLayout.svelte';
  
  // Get search query from URL
  const searchQuery = $derived($page.url.searchParams.get('q') || '');
  let searchInput = $state('');
  
  // Create reactive query for all clients
  const clientsQuery = new ReactiveQuery(() => {
    const zero = getZero();
    if (!zero || !zero.query) return null;
    
    // Get all clients ordered by name
    return zero.query.clients.orderBy('name', 'asc');
  }, { expectsCollection: true });
  
  // Filter clients based on search query
  const filteredClients = $derived.by(() => {
    if (!searchQuery.trim()) {
      return [];
    }
    
    const normalizedSearch = searchQuery.toLowerCase().trim();
    const allClients = clientsQuery.records || [];
    
    return allClients.filter(client => {
      const clientName = client.name?.toLowerCase() || '';
      const normalizedName = client.name_normalized?.toLowerCase() || '';
      return clientName.includes(normalizedSearch) || normalizedName.includes(normalizedSearch);
    });
  });
  
  // Handle search submission
  function handleSearch(event: Event) {
    event.preventDefault();
    
    if (searchInput.trim()) {
      // Update URL with new search query
      goto(`/search?q=${encodeURIComponent(searchInput.trim())}`, { replaceState: false });
    } else {
      // Clear search - go back to homepage
      goto('/');
    }
  }
  
  // Navigate to client detail page
  function navigateToClient(clientId: string) {
    goto(`/clients/${clientId}`);
  }
  
  // Navigate to new client creation
  function createNewClient() {
    // TODO: Implement new client creation flow
    // For now, just log
    console.log('Create new client - not yet implemented');
  }
  
  // Initialize search input and focus when page loads
  onMount(() => {
    searchInput = searchQuery;
    const input = document.querySelector('input[type="search"]') as HTMLInputElement;
    if (input) {
      input.focus();
      // Place cursor at end of input
      input.setSelectionRange(input.value.length, input.value.length);
    }
  });
  
  // Helper to get client type emoji
  function getClientTypeEmoji(type: string | null | undefined): string {
    switch (type) {
      case 'business':
        return '🏢';
      case 'residential':
        return '🏠';
      default:
        return '👤';
    }
  }
</script>

<svelte:head>
  <title>Search - Faultless</title>
</svelte:head>

<AppLayout>
  <div class="search-page">
  <!-- Search Header -->
  <div class="search-header">
    <form class="search-form" onsubmit={handleSearch}>
      <div class="search-input-container">
        <input
          type="search"
          class="search-input"
          placeholder="Search"
          bind:value={searchInput}
          disabled={clientsQuery.isLoading}
        />
        <button 
          type="submit" 
          class="search-button"
          disabled={clientsQuery.isLoading || !searchInput.trim()}
        >
          Search
        </button>
      </div>
    </form>
  </div>
  
  <!-- Results Area -->
  <div class="search-results">
    {#if clientsQuery.isLoading}
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading clients...</p>
      </div>
    {:else if clientsQuery.error}
      <div class="error-state">
        <p>Error loading clients. Please try again.</p>
      </div>
    {:else if searchQuery}
      <div class="results-list">
        <!-- Client Results -->
        {#each filteredClients as client (client.id)}
          <button
            class="result-item"
            onclick={() => navigateToClient(client.id)}
          >
            <span class="client-icon">{getClientTypeEmoji(client.client_type)}</span>
            <span class="client-name">{client.name || 'Unnamed Client'}</span>
          </button>
        {/each}
        
        <!-- New Client Option -->
        <button
          class="result-item new-client-item"
          onclick={createNewClient}
        >
          <span class="client-icon">➕</span>
          <span class="client-name">New Client</span>
        </button>
      </div>
      
      {#if filteredClients.length === 0}
        <p class="no-results">No clients found matching "{searchQuery}"</p>
      {/if}
    {/if}
  </div>
</div>
</AppLayout>

<style>
  .search-page {
    min-height: 100vh;
    background-color: var(--bg-black, #000);
  }
  
  /* Search Header */
  .search-header {
    position: sticky;
    top: 0;
    z-index: 10;
    background-color: var(--bg-black, #000);
    padding: 20px;
    border-bottom: 1px solid var(--border-primary, #38383A);
  }
  
  .search-form {
    max-width: 800px;
    margin: 0 auto;
  }
  
  .search-input-container {
    position: relative;
    display: flex;
    align-items: center;
    background-color: var(--bg-secondary, #1C1C1D);
    border: 1px solid var(--border-primary, #38383A);
    border-radius: 12px;
    transition: all 0.15s ease;
  }
  
  .search-input-container:focus-within {
    border-color: var(--accent-blue, #00A3FF);
    box-shadow: 0 0 0 3px rgba(0, 163, 255, 0.1);
  }
  
  .search-input {
    flex: 1;
    padding: 14px 18px;
    background: none;
    border: none;
    color: var(--text-primary, #F2F2F7);
    font-size: 16px;
    font-weight: 400;
    outline: none;
  }
  
  .search-input::placeholder {
    color: var(--text-tertiary, #8E8E93);
  }
  
  /* Remove search input webkit styling */
  .search-input::-webkit-search-decoration,
  .search-input::-webkit-search-cancel-button,
  .search-input::-webkit-search-results-button,
  .search-input::-webkit-search-results-decoration {
    display: none;
  }
  
  .search-button {
    margin: 6px;
    padding: 10px 20px;
    background-color: var(--accent-blue, #00A3FF);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
  }
  
  .search-button:hover:not(:disabled) {
    background-color: var(--accent-blue-hover, #0089E0);
  }
  
  .search-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  /* Results Area */
  .search-results {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }
  
  .results-list {
    display: flex;
    flex-direction: column;
    gap: 1px;
    background-color: var(--border-primary, #38383A);
    border-radius: 12px;
    overflow: hidden;
  }
  
  .result-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    background-color: var(--bg-secondary, #1C1C1D);
    border: none;
    color: var(--text-primary, #F2F2F7);
    font-size: 16px;
    font-weight: 400;
    text-align: left;
    cursor: pointer;
    transition: all 0.15s ease;
    width: 100%;
  }
  
  .result-item:hover {
    background-color: var(--bg-tertiary, #3A3A3C);
  }
  
  .result-item:active {
    background-color: var(--bg-quaternary, #48484A);
  }
  
  .new-client-item {
    color: var(--accent-blue, #00A3FF);
  }
  
  .client-icon {
    font-size: 20px;
    width: 24px;
    text-align: center;
    flex-shrink: 0;
  }
  
  .client-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  /* States */
  .loading-state,
  .error-state {
    text-align: center;
    padding: 40px 20px;
    color: var(--text-secondary, #C7C7CC);
  }
  
  .no-results {
    text-align: center;
    padding: 40px 20px;
    color: var(--text-secondary, #C7C7CC);
    font-size: 16px;
  }
  
  .spinner {
    width: 32px;
    height: 32px;
    border: 2px solid rgba(0, 163, 255, 0.2);
    border-top: 2px solid var(--accent-blue, #00A3FF);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 16px;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  /* Responsive adjustments */
  @media (max-width: 640px) {
    .search-header {
      padding: 16px;
    }
    
    .search-results {
      padding: 16px;
    }
    
    .result-item {
      padding: 14px 16px;
      font-size: 15px;
    }
  }
</style>