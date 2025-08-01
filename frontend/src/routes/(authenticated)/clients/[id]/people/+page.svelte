<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import AppLayout from '$lib/components/layout/AppLayout.svelte';
  import SearchBar from '$lib/components/layout/SearchBar.svelte';
  import BasePopover from '$lib/components/ui/BasePopover.svelte';
  import CircularButton from '$lib/components/ui/CircularButton.svelte';
  import { ReactivePerson } from '$lib/models/reactive-person';
  import { ReactivePeopleGroup } from '$lib/models/reactive-people-group';
  import { ReactiveClient } from '$lib/models/reactive-client';

  // Icon paths
  const PersonIcon = '/icons/person.circle.fill.svg';
  const ChevronIcon = '/icons/chevron-right.svg';
  const FilterIcon = '/icons/filter-inactive.svg';

  let clientId = $page.params.id;
  let searchQuery = '';

  // Filter states
  let showActiveOnly = false;
  let selectedGroupId: string | null = null;
  let selectedDepartmentId: string | null = null;
  let showFilterPopover = false;

  // Load client to ensure it exists
  const clientQuery = $derived(ReactiveClient.find(clientId));
  const client = $derived(clientQuery?.data);

  // Load people for this client
  const peopleQuery = $derived(
    ReactivePerson.where({ client_id: clientId }).orderBy('name', 'asc').all()
  );

  // Load groups and departments for this client
  const groupsQuery = $derived(
    ReactivePeopleGroup.where({ client_id: clientId }).orderBy('name', 'asc').all()
  );
  const allGroups = $derived(groupsQuery?.data || []);
  const groups = $derived(allGroups.filter((g) => !g.is_department));
  const departments = $derived(allGroups.filter((g) => g.is_department));

  // Filter function for people (client-side filtering)
  function shouldShowPerson(person: any): boolean {
    // Apply search filter
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();

      // Search in name
      const nameMatch = person.name && person.name.toLowerCase().includes(query);

      // Search in preferred name
      const preferredNameMatch =
        person.name_preferred && person.name_preferred.toLowerCase().includes(query);

      // Search in title
      const titleMatch = person.title && person.title.toLowerCase().includes(query);

      if (!nameMatch && !preferredNameMatch && !titleMatch) {
        return false;
      }
    }

    // Apply active filter
    if (showActiveOnly && !person.is_active) {
      return false;
    }

    // Apply group/department filter
    // TODO: Group filtering is temporarily disabled as the relationship is not available in Zero.js
    // This would need to be implemented differently, perhaps by loading group memberships separately

    return true;
  }

  // Get all people for the client
  const allPeople = $derived(peopleQuery?.data || []);

  // Apply client-side filtering
  const people = $derived(allPeople.filter((person) => shouldShowPerson(person)));

  // Loading and error states
  const loading = $derived(peopleQuery?.isLoading || clientQuery?.isLoading || false);
  const error = $derived(peopleQuery?.error || clientQuery?.error);

  // Reset filters
  function resetFilters() {
    showActiveOnly = false;
    selectedGroupId = null;
    selectedDepartmentId = null;
  }

  // Navigate to person details
  function navigateToPerson(personId: string) {
    goto(`/clients/${clientId}/people/${personId}`);
  }

  // Calculate active filters count
  const activeFiltersCount = $derived(
    [showActiveOnly, selectedGroupId, selectedDepartmentId].filter(Boolean).length
  );
</script>

<AppLayout currentClient={client}>
  <div class="people-page">
    <!-- Search and Filters -->
    <div class="search-section">
      <div class="search-container">
        <SearchBar bind:value={searchQuery} placeholder="Search people by name or title..." />
      </div>

      <div class="filter-button">
        <BasePopover bind:isOpen={showFilterPopover}>
          <CircularButton
            slot="trigger"
            iconSrc={FilterIcon}
            size="medium"
            badgeCount={activeFiltersCount}
          />
          <div slot="content" class="filter-popover">
            <h3>Filter People</h3>

            <div class="filter-section">
              <label>
                <input type="checkbox" bind:checked={showActiveOnly} />
                Active only
              </label>
            </div>

            {#if departments.length > 0}
              <div class="filter-section">
                <label for="department-filter">Department</label>
                <select id="department-filter" bind:value={selectedDepartmentId}>
                  <option value={null}>All departments</option>
                  {#each departments as dept}
                    <option value={dept.id}>{dept.name}</option>
                  {/each}
                </select>
              </div>
            {/if}

            {#if groups.length > 0}
              <div class="filter-section">
                <label for="group-filter">Group</label>
                <select id="group-filter" bind:value={selectedGroupId}>
                  <option value={null}>All groups</option>
                  {#each groups as group}
                    <option value={group.id}>{group.name}</option>
                  {/each}
                </select>
              </div>
            {/if}

            <div class="filter-actions">
              <button
                class="reset-button"
                on:click={resetFilters}
                disabled={activeFiltersCount === 0}
              >
                Reset Filters
              </button>
            </div>
          </div>
        </BasePopover>
      </div>
    </div>

    <!-- Results Count -->
    {#if !loading}
      <div class="results-info">
        {people.length}
        {people.length === 1 ? 'person' : 'people'} found
      </div>
    {/if}

    <!-- People List -->
    <div class="people-list">
      {#if loading}
        <div class="loading-state">
          <p>Loading people...</p>
        </div>
      {:else if error}
        <div class="error-state">
          <div class="icon" aria-hidden="true">
            <img src="/icons/caution-triangle-yellow.svg" alt="" />
          </div>
          <p>{error.message || 'Failed to load people'}</p>
        </div>
      {:else if people.length === 0}
        <div class="empty-state">
          <div class="icon" aria-hidden="true"><img src={PersonIcon} alt="" /></div>
          <p>No people found</p>
          {#if searchQuery || activeFiltersCount > 0}
            <button on:click={resetFilters}>Clear filters</button>
          {/if}
        </div>
      {:else}
        {#each people as person}
          <button class="person-row" on:click={() => navigateToPerson(person.id)} type="button">
            <div class="person-icon" aria-hidden="true">
              <img src={PersonIcon} alt="" />
            </div>

            <div class="person-info">
              <div class="person-name">
                {person.name_preferred || person.name}
                {#if person.name_pronunciation_hint}
                  <span class="pronunciation">({person.name_pronunciation_hint})</span>
                {/if}
              </div>

              {#if person.title}
                <div class="person-title">{person.title}</div>
              {/if}

              <div class="person-meta">
                {#if !person.is_active}
                  <span class="inactive-badge">Inactive</span>
                {/if}

                {#if person.contactMethods?.length}
                  {@const primaryContact =
                    person.contactMethods.find((cm) => cm.is_primary) || person.contactMethods[0]}
                  {#if primaryContact}
                    <span class="contact-info">
                      {primaryContact.formatted_value || primaryContact.value}
                    </span>
                  {/if}
                {/if}
              </div>
            </div>

            <div class="chevron-icon" aria-hidden="true">
              <img src={ChevronIcon} alt="" />
            </div>
          </button>
        {/each}
      {/if}
    </div>
  </div>
</AppLayout>

<style>
  .people-page {
    padding: 1rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .search-section {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
    align-items: center;
  }

  .search-container {
    flex: 1;
  }

  .filter-popover {
    padding: 1rem;
    min-width: 250px;
  }

  .filter-popover h3 {
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
  }

  .filter-section {
    margin-bottom: 1rem;
  }

  .filter-section label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.95rem;
    cursor: pointer;
  }

  .filter-section select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 0.375rem;
    background-color: var(--background-color);
    color: var(--text-color);
    font-size: 0.95rem;
    margin-top: 0.5rem;
  }

  .filter-actions {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color);
  }

  .reset-button {
    width: 100%;
    padding: 0.5rem;
    background-color: var(--secondary-color);
    color: var(--text-color);
    border: none;
    border-radius: 0.375rem;
    font-size: 0.9rem;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .reset-button:hover:not(:disabled) {
    opacity: 0.8;
  }

  .reset-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .results-info {
    color: var(--secondary-text-color);
    font-size: 0.95rem;
    margin-bottom: 1rem;
  }

  .people-list {
    background-color: var(--card-background);
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .person-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    border-bottom: 1px solid var(--border-color);
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .person-row:last-child {
    border-bottom: none;
  }

  .person-row:hover {
    background-color: var(--hover-background);
  }

  .person-icon {
    width: 40px;
    height: 40px;
    color: var(--primary-color);
    flex-shrink: 0;
  }

  .person-icon img {
    width: 100%;
    height: 100%;
  }

  .person-info {
    flex: 1;
    min-width: 0;
  }

  .person-name {
    font-weight: 500;
    color: var(--text-color);
    margin-bottom: 0.25rem;
  }

  .pronunciation {
    font-size: 0.9rem;
    color: var(--secondary-text-color);
    font-weight: normal;
  }

  .person-title {
    font-size: 0.95rem;
    color: var(--secondary-text-color);
    margin-bottom: 0.25rem;
  }

  .person-meta {
    display: flex;
    gap: 1rem;
    align-items: center;
    font-size: 0.85rem;
  }

  .inactive-badge {
    background-color: var(--warning-background);
    color: var(--warning-color);
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-weight: 500;
  }

  .contact-info {
    color: var(--secondary-text-color);
  }

  .chevron-icon {
    width: 20px;
    height: 20px;
    color: var(--secondary-text-color);
    flex-shrink: 0;
  }

  .loading-state,
  .error-state,
  .empty-state {
    padding: 3rem 1rem;
    text-align: center;
    color: var(--secondary-text-color);
  }

  .error-state .icon,
  .empty-state .icon {
    width: 48px;
    height: 48px;
    margin: 0 auto 1rem;
    opacity: 0.5;
  }

  .error-state .icon img,
  .empty-state .icon img {
    width: 100%;
    height: 100%;
  }

  .error-state .icon {
    color: var(--error-color);
  }

  .empty-state button {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background-color: var(--primary-color);
    color: white;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.95rem;
  }

  .empty-state button:hover {
    opacity: 0.9;
  }
</style>
