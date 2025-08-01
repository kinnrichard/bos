<script lang="ts">
  // Stores
  import { layout, layoutActions } from '$lib/stores/layout.svelte';
  import { page } from '$app/stores';

  // Navigation
  import { goto } from '$app/navigation';

  // Components
  import CircularButton from '$lib/components/ui/CircularButton.svelte';
  import TextButton from '$lib/components/ui/TextButton.svelte';
  import TaskFilterPopover from './TaskFilterPopover.svelte';
  import ClientTypeFilterPopover from './ClientTypeFilterPopover.svelte';
  import JobFilterPopover from './JobFilterPopover.svelte';
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
    if (
      routeId === ROUTE_PATTERNS.clientPeople ||
      routeId === '/(authenticated)/clients/[id]/people/new' ||
      routeId === '/(authenticated)/clients/[id]/people/[personId]'
    )
      return 'people';
    if (routeId.includes('/clients')) return 'clients';
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
  const showJobFilter = $derived(
    currentPageType === 'jobs' &&
      ($page.route.id === '/(authenticated)/jobs' || $page.route.id === ROUTE_PATTERNS.clientJobs)
  );

  // Show client actions when on client detail page
  const showClientActions = $derived(
    $page.route.id === '/(authenticated)/clients/[id]' ||
      $page.route.id === '/(authenticated)/clients/new'
  );

  // Show person actions when on person new/edit pages
  const showPersonActions = $derived(
    $page.route.id === '/(authenticated)/clients/[id]/people/new' ||
      $page.route.id === '/(authenticated)/clients/[id]/people/[personId]'
  );

  // Page actions configuration
  const pageActions = $derived.by((): PageAction[] => {
    // Don't show + button on client detail/edit/new pages
    if (showClientActions) {
      return [];
    }

    switch (currentPageType) {
      case 'jobs':
        // Only show new job button when on client-specific jobs page
        if (currentRoute === ROUTE_PATTERNS.clientJobs && currentClientId) {
          return [
            {
              label: 'New Job',
              icon: '/icons/plus.svg',
              iconType: 'svg',
              action: () => goto(`/jobs/new?clientId=${currentClientId}`),
              testId: 'create-job-button',
            },
          ];
        }
        // No new job button on main jobs page - users must go through a client
        return [];

      case 'clients':
        return [
          {
            label: 'New Client',
            icon: '/icons/plus.svg',
            iconType: 'svg',
            action: () => goto('/clients/new'),
            testId: 'create-client-button',
          },
        ];

      case 'people':
        // Only show add person button when on a client's people page
        // but NOT when already adding a new person or viewing a specific person
        if (
          currentRoute === ROUTE_PATTERNS.clientPeople &&
          currentClientId &&
          !$page.url.pathname.includes('/people/new') &&
          !$page.params.personId
        ) {
          return [
            {
              label: 'Add Person',
              icon: '/icons/plus.svg',
              iconType: 'svg',
              action: () => goto(`/clients/${currentClientId}/people/new`),
              testId: 'add-person-button',
            },
          ];
        }
        return [];

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

    <!-- Client actions - Cancel button -->
    {#if showClientActions && layout.isEditingClient && layout.clientEditCallbacks}
      <TextButton
        variant="ghost-danger"
        size="normal"
        onclick={() => layout.clientEditCallbacks?.onCancel?.()}
        disabled={disabled || layout.isSavingClient}
        ariaLabel="Cancel editing"
      >
        Cancel
      </TextButton>
    {/if}

    <!-- Person actions - Cancel button -->
    {#if showPersonActions && layout.personEditCallbacks}
      <TextButton
        variant="ghost-danger"
        size="normal"
        onclick={() => layout.personEditCallbacks?.onCancel?.()}
        disabled={disabled || layout.isSavingPerson}
        ariaLabel="Cancel"
      >
        Cancel
      </TextButton>
    {/if}
  </div>

  <!-- Right section: Filters + Search + User menu -->
  <div class="toolbar-right">
    <!-- Task filter -->
    {#if showTaskFilter}
      <TaskFilterPopover {disabled} />
    {/if}

    <!-- Job filter -->
    {#if showJobFilter}
      <JobFilterPopover {disabled} />
    {/if}

    <!-- Client filter -->
    {#if showClientFilter}
      <ClientTypeFilterPopover {disabled} />
    {/if}

    <!-- Client actions - Edit/Done buttons -->
    {#if showClientActions && layout.clientEditCallbacks}
      {#if layout.isEditingClient}
        <TextButton
          variant="primary"
          size="normal"
          onclick={() => layout.clientEditCallbacks?.onSave?.()}
          disabled={disabled || layout.isSavingClient || !layout.canSaveClient}
          loading={layout.isSavingClient}
          ariaLabel={layout.isNewClient ? 'Create client' : 'Save changes'}
        >
          {#if layout.isSavingClient}
            Saving...
          {:else}
            Save
          {/if}
        </TextButton>
      {:else}
        <TextButton
          variant="ghost"
          size="normal"
          onclick={() => layout.clientEditCallbacks?.onEdit?.()}
          {disabled}
          ariaLabel="Edit client"
        >
          Edit
        </TextButton>
      {/if}
    {/if}

    <!-- Person actions - Save button -->
    {#if showPersonActions && layout.personEditCallbacks}
      <TextButton
        variant="primary"
        size="normal"
        onclick={() => layout.personEditCallbacks?.onSave?.()}
        disabled={disabled || layout.isSavingPerson || !layout.canSavePerson}
        loading={layout.isSavingPerson}
        ariaLabel={layout.isNewPerson ? 'Create person' : 'Save changes'}
      >
        {#if layout.isSavingPerson}
          Saving...
        {:else}
          Save
        {/if}
      </TextButton>
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
