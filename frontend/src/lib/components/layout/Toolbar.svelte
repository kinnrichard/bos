<script lang="ts">
  // Stores
  import { layout, layoutActions } from '$lib/stores/layout.svelte';
  import { page } from '$app/stores';

  // Navigation
  import { goto } from '$app/navigation';

  // Components
  import CircularButton from '$lib/components/ui/CircularButton.svelte';
  import TaskFilterPopover from './TaskFilterPopover.svelte';
  import ClientTypeFilterPopover from './ClientTypeFilterPopover.svelte';
  import SearchBar from './SearchBar.svelte';
  import PageActionsBar from './PageActionsBar.svelte';
  import JobControlsBar from './JobControlsBar.svelte';

  // Types
  import type { PopulatedJob } from '$lib/types/job';
  import type { SearchContext, PageType, PageAction } from '$lib/types/toolbar';
  import { ROUTE_PATTERNS } from '$lib/types/toolbar';

  // Utilities
  import { debugComponent } from '$lib/utils/debug';
  import { getSearchConfig, clearAllSearches } from '$lib/utils/searchManager';

  // Props
  interface Props {
    currentJob?: PopulatedJob | null;
    disabled?: boolean;
  }

  const { currentJob = null, disabled = false }: Props = $props();

  // Route analysis
  function getSearchContext(): SearchContext {
    const routeId = $page?.route?.id;
    if (!routeId) return null;

    if (routeId === ROUTE_PATTERNS.jobDetail) return 'tasks';
    if (routeId === '/(authenticated)/jobs') return 'jobs';
    if (routeId === ROUTE_PATTERNS.clientJobs) return 'client-jobs';
    if (routeId === ROUTE_PATTERNS.clients && !$page.url.pathname.includes('/search'))
      return 'clients';

    return null;
  }

  function getCurrentPageType(): PageType {
    const routeId = $page?.route?.id;
    if (!routeId) return 'home';

    if (routeId === ROUTE_PATTERNS.jobDetail) return 'job-detail';
    if (routeId.includes('/jobs')) return 'jobs';
    if (routeId.includes('/clients')) return 'clients';
    if (routeId.includes('/people')) return 'people';
    if (routeId.includes('/devices')) return 'devices';

    return 'home';
  }

  // Reactive state
  const searchContext = $derived(getSearchContext());
  const currentPageType = $derived(getCurrentPageType());
  const searchConfig = $derived(getSearchConfig(searchContext));

  // Route-specific data
  const currentRoute = $derived($page.route.id);
  const currentClientId = $derived($page.params.id);

  // Show/hide logic
  const showJobControls = $derived(
    (currentPageType === 'job-detail' && $page.params.id) ||
      (currentJob && $page.route.id?.includes('/jobs/new'))
  );

  const showTaskFilter = $derived(showJobControls);
  const showClientFilter = $derived(
    currentPageType === 'clients' && $page.route.id === ROUTE_PATTERNS.clients
  );

  // Page actions configuration
  const pageActions = $derived.by((): PageAction[] => {
    switch (currentPageType) {
      case 'jobs':
        return [
          {
            label: 'New Job',
            icon: '/icons/plus.svg',
            iconType: 'svg',
            action: () => {
              const clientId = currentRoute === ROUTE_PATTERNS.clientJobs ? currentClientId : null;
              goto(clientId ? `/jobs/new?clientId=${clientId}` : '/jobs/new');
            },
            testId: 'create-job-button',
          },
        ];

      case 'clients':
        return [
          {
            label: 'New Client',
            icon: '➕',
            iconType: 'emoji',
            action: () => goto('/clients/new'),
          },
        ];

      case 'people':
        return [
          {
            label: 'Add Person',
            icon: '➕',
            iconType: 'emoji',
            action: () => debugComponent('Add person action triggered'),
          },
        ];

      case 'devices':
        return [
          {
            label: 'Add Device',
            icon: '➕',
            iconType: 'emoji',
            action: () => debugComponent('Add device action triggered'),
          },
        ];

      default:
        return [];
    }
  });

  // Clear all searches when context changes
  $effect(() => {
    if (searchContext) {
      clearAllSearches();
    }
  });
</script>

<div class="toolbar" role="navigation" aria-label="Main toolbar">
  <!-- Left section: Sidebar toggle + Page actions + Job controls -->
  <div class="toolbar-left">
    <!-- Sidebar toggle (only show when sidebar is hidden) -->
    {#if !layout.sidebarVisible}
      <CircularButton
        variant="default"
        size="normal"
        onclick={disabled ? undefined : layoutActions.toggleSidebar}
        title={disabled ? 'Disabled' : 'Show sidebar'}
        {disabled}
        aria-label="Show sidebar"
      >
        <img src="/icons/sidebar.svg" alt="" class="sidebar-icon" />
      </CircularButton>
    {/if}

    <!-- Page-specific actions -->
    <PageActionsBar actions={pageActions} {disabled} />

    <!-- Job controls -->
    {#if showJobControls}
      <JobControlsBar jobId={$page.params.id || currentJob?.id || 'new'} {currentJob} {disabled} />
    {/if}
  </div>

  <!-- Right section: Filters + Search + User menu -->
  <div class="toolbar-right">
    <!-- Task filter -->
    {#if showTaskFilter}
      <TaskFilterPopover {disabled} />
    {/if}

    <!-- Client filter -->
    {#if showClientFilter}
      <ClientTypeFilterPopover {disabled} />
    {/if}

    <!-- Search bar -->
    <SearchBar config={searchConfig} {disabled} />

    <!-- User menu -->
    <div class="user-menu">
      <CircularButton
        variant="avatar"
        size="normal"
        title={disabled ? 'Disabled' : 'User menu'}
        {disabled}
        aria-label="User menu"
      >
        <span class="user-initials">OL</span>
      </CircularButton>
    </div>
  </div>
</div>

<style>
  /* Layout */
  .toolbar {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
  }

  .toolbar-left,
  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  /* Icons */
  .sidebar-icon {
    width: 20px;
    height: 20px;
    opacity: 0.7;
  }

  /* User menu */
  .user-initials {
    color: white;
    font-size: 13px;
    font-weight: 600;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .toolbar {
      padding: 0 20px;
    }

    .toolbar-left,
    .toolbar-right {
      gap: 8px;
    }
  }

  @media (max-width: 480px) {
    .user-initials {
      font-size: 12px;
    }
  }
</style>
