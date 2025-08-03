<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import AppLayout from '$lib/components/layout/AppLayout.svelte';
  import PersonForm from '$lib/components/person/PersonForm.svelte';
  import LoadingSkeleton from '$lib/components/ui/LoadingSkeleton.svelte';
  import { ReactivePerson } from '$lib/models/reactive-person';
  import { ReactiveClient } from '$lib/models/reactive-client';
  import { Person } from '$lib/models/person';
  import { layoutActions } from '$lib/stores/layout.svelte';

  let clientId = $page.params.id;
  let personId = $page.params.personId;

  let isEditing = $state(false);
  let isSaving = $state(false);
  let error = $state<string | null>(null);

  // Load client
  const clientQuery = $derived(ReactiveClient.find(clientId));
  const client = $derived(clientQuery?.data);

  // Load person with relationships
  const personQuery = $derived(ReactivePerson.includes('contactMethods').find(personId));
  const person = $derived(personQuery?.data);
  const loading = $derived(personQuery?.isLoading || false);
  const queryError = $derived(personQuery?.error);

  // Handle form events
  function handleEdit() {
    isEditing = true;
    error = null;
  }

  function handleSave() {
    isEditing = false;
    // The reactive query will automatically update
  }

  function handleCancel() {
    isEditing = false;
    error = null;
  }

  // Handle delete
  async function handleDelete() {
    try {
      await Person.destroy(personId);
      goto(`/clients/${clientId}/people`);
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Failed to delete person. Please try again.';
    }
  }

  // Setup edit state in layout
  $effect(() => {
    layoutActions.setPersonEditState(isEditing, false);
    layoutActions.setSavingPerson(isSaving);
    layoutActions.setCanSavePerson(true); // PersonForm handles its own validation
    layoutActions.setPersonEditCallbacks({
      onEdit: handleEdit,
      onSave: () => {}, // PersonForm handles saving internally
      onCancel: handleCancel,
    });

    // Set page title based on mode
    if (isEditing) {
      layoutActions.setPageTitle('Edit Person');
    } else {
      layoutActions.setPageTitle(null); // No title in view mode
    }

    return () => {
      layoutActions.clearPersonEditState();
      layoutActions.clearPageTitle();
    };
  });
</script>

<AppLayout currentClient={client}>
  <div class="person-detail-page">
    {#if loading}
      <div class="loading-state">
        <LoadingSkeleton type="detail" />
      </div>
    {:else if queryError}
      <div class="error-state">
        <h1>Error Loading Person</h1>
        <p>{queryError.message || 'Failed to load person'}</p>
        <button class="retry-button" onclick={() => window.location.reload()}>Try Again</button>
      </div>
    {:else if person}
      <PersonForm
        mode={isEditing ? 'edit' : 'view'}
        {person}
        {clientId}
        loading={isSaving}
        {error}
        on:save={handleSave}
        on:cancel={handleCancel}
        on:delete={handleDelete}
      />
    {/if}
  </div>
</AppLayout>

<style>
  .person-detail-page {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  .loading-state,
  .error-state {
    padding: 3rem 1rem;
    text-align: center;
    color: var(--secondary-text-color);
  }

  .retry-button {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background-color: var(--primary-color);
    color: white;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.95rem;
  }

  .retry-button:hover {
    opacity: 0.9;
  }

  @media (max-width: 768px) {
    .person-detail-page {
      padding: 1rem 0.5rem;
    }
  }
</style>
