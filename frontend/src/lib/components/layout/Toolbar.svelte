<script lang="ts">
  import { sidebarVisible, isMobile, currentPage, layoutActions } from '$lib/stores/layout';

  // Search functionality
  let searchQuery = '';
  let searchFocused = false;

  function handleSearch() {
    if (searchQuery.trim()) {
      console.log('Search:', searchQuery);
      // TODO: Implement search functionality
    }
  }

  function handleSearchKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      handleSearch();
    }
    if (event.key === 'Escape') {
      searchQuery = '';
      (event.target as HTMLInputElement).blur();
    }
  }

  // Page-specific actions based on current page
  $: pageActions = getPageActions($currentPage);

  function getPageActions(page: string) {
    switch (page) {
      case 'jobs':
        return [
          { label: 'New Job', icon: '➕', action: () => console.log('New job') },
          { label: 'Filter', icon: '🔽', action: () => console.log('Filter jobs') }
        ];
      case 'clients':
        return [
          { label: 'New Client', icon: '➕', action: () => console.log('New client') }
        ];
      case 'people':
        return [
          { label: 'Add Person', icon: '➕', action: () => console.log('Add person') }
        ];
      case 'devices':
        return [
          { label: 'Add Device', icon: '➕', action: () => console.log('Add device') }
        ];
      default:
        return [];
    }
  }
</script>

<div class="toolbar">
  <!-- Left section: Logo + Mobile sidebar toggle -->
  <div class="toolbar-left">

    <!-- Sidebar toggle -->
    <button 
      class="sidebar-toggle"
      on:click={layoutActions.toggleSidebar}
      aria-label={$sidebarVisible ? 'Hide sidebar' : 'Show sidebar'}
    >
      <img src="/icons/sidebar.svg" alt="Menu" />
    </button>
  </div>

  <!-- Right section: Search + Page actions + User menu -->
  <div class="toolbar-right">
    <!-- Search -->
    <!-- Page-specific actions -->
    {#if pageActions.length > 0}
      <div class="page-actions">
        {#each pageActions as action}
          <button 
            class="action-btn"
            on:click={action.action}
            title={action.label}
          >
            <span class="action-icon">{action.icon}</span>
            <span class="action-label">{action.label}</span>
          </button>
        {/each}
      </div>
    {/if}
	
	<div class="search-container" class:focused={searchFocused}>
	  <div class="search-input-wrapper">
	    <img src="/icons/search.svg" alt="Search" class="search-icon" />
	    <input
	      type="text"
	      placeholder="Search"
	      bind:value={searchQuery}
	      on:focus={() => searchFocused = true}
	      on:blur={() => searchFocused = false}
	      on:keydown={handleSearchKeydown}
	      class="search-input"
	    />
	    {#if searchQuery}
	      <button 
	        class="search-clear"
	        on:click={() => searchQuery = ''}
	        aria-label="Clear search"
	      >
	        <img src="/temp/close.svg" alt="Clear" />
	      </button>
	    {/if}
	  </div>
	</div>

    <!-- User menu -->
    <div class="user-menu">
      <button class="user-avatar" aria-label="User menu">
        <span class="user-initials">OL</span>
      </button>
    </div>
  </div>
</div>

<style>
  .toolbar {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    background-color: var(--bg-black);
  }

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  /* Logo */
  .logo-container {
    display: flex;
    align-items: center;
    margin-right: 8px;
  }

  .logo {
    height: 28px;
    width: auto;
  }

  /* Mobile sidebar toggle */
  .sidebar-toggle {
    width: 36px;
    height: 36px;
    background: none;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.15s ease;
  }

  .sidebar-toggle:hover {
    background-color: var(--bg-tertiary);
  }

  .sidebar-toggle img {
    width: 20px;
    height: 20px;
    opacity: 0.7;
  }

  /* Search container */
  .search-container {
    position: relative;
    min-width: 320px;
    max-width: 420px;
  }

  .search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 10px;
    transition: all 0.15s ease;
    height: 40px;
  }

  .search-container.focused .search-input-wrapper {
    border-color: var(--accent-blue);
    box-shadow: 0 0 0 3px rgba(0, 163, 255, 0.1);
  }

  .search-icon {
    width: 16px;
    height: 16px;
    opacity: 0.5;
    margin-left: 12px;
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    padding: 0 12px;
    color: var(--text-primary);
    font-size: 14px;
    min-width: 0;
    height: 100%;
  }

  .search-input::placeholder {
    color: var(--text-tertiary);
  }

  .search-clear {
    width: 20px;
    height: 20px;
    background: none;
    border: none;
    cursor: pointer;
    margin-right: 8px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.15s ease;
  }

  .search-clear:hover {
    background-color: var(--bg-tertiary);
  }

  .search-clear img {
    width: 12px;
    height: 12px;
    opacity: 0.5;
  }

  /* Page actions */
  .page-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    height: 40px;
  }

  .action-btn:hover {
    background-color: var(--bg-tertiary);
    border-color: var(--accent-blue);
  }

  .action-icon {
    font-size: 14px;
  }

  .action-label {
    white-space: nowrap;
  }

  /* User menu */
  .user-avatar {
    width: 40px;
    height: 40px;
    border-radius: 20px;
    background-color: var(--accent-red);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.15s ease;
    flex-shrink: 0;
  }

  .user-avatar:hover {
    opacity: 0.9;
  }

  .user-initials {
    color: white;
    font-size: 14px;
    font-weight: 600;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }

  /* Responsive adjustments */
  @media (max-width: 1024px) {
    .search-container {
      min-width: 280px;
    }

    .action-label {
      display: none;
    }

    .action-btn {
      padding: 10px;
      width: 40px;
      height: 40px;
      justify-content: center;
    }
  }

  @media (max-width: 768px) {
    .toolbar {
      padding: 0 20px;
    }

    .toolbar-left,
    .toolbar-right {
      gap: 16px;
    }

    .search-container {
      min-width: 240px;
    }

    .page-actions {
      gap: 8px;
    }
  }

  @media (max-width: 480px) {
    .search-container {
      min-width: 150px;
    }

    .action-btn {
      width: 28px;
      height: 28px;
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 16px;
    }

    .user-initials {
      font-size: 12px;
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .search-input-wrapper,
    .action-btn {
      border-width: 2px;
    }

    .search-container.focused .search-input-wrapper {
      box-shadow: 0 0 0 3px rgba(0, 163, 255, 0.3);
    }
  }

  /* Accessibility improvements */
  @media (prefers-reduced-motion: reduce) {
    .search-input-wrapper,
    .action-btn,
    .sidebar-toggle,
    .user-avatar {
      transition: none;
    }
  }
</style>