<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import AppLayout from '$lib/components/layout/AppLayout.svelte';
  import FormInput from '$lib/components/ui/FormInput.svelte';
  import CircularButton from '$lib/components/ui/CircularButton.svelte';
  import { Person } from '$lib/models/person';
  import { ContactMethod } from '$lib/models/contact-method';
  import { PeopleGroupMembership } from '$lib/models/people-group-membership';
  import { ReactivePeopleGroup } from '$lib/models/reactive-people-group';
  import { ReactiveClient } from '$lib/models/reactive-client';
  import type { CreatePersonData } from '$lib/models/types/person-data';
  import { layoutActions } from '$lib/stores/layout.svelte';

  // Icon paths
  const PlusIcon = '/icons/plus.svg';
  const TrashIcon = '/icons/trash-red.svg';

  let clientId = $page.params.id;
  let loading = $state(false);
  let error = $state<string | null>(null);

  // Load client to ensure it exists and for layout
  const clientQuery = $derived(ReactiveClient.find(clientId));
  const client = $derived(clientQuery?.data);

  // Load groups and departments for this client
  const groupsQuery = $derived(
    ReactivePeopleGroup.where({ client_id: clientId }).orderBy('name', 'asc')
  );
  const allGroups = $derived(groupsQuery?.data || []);
  const groups = $derived(allGroups.filter((g) => !g.is_department));
  const departments = $derived(allGroups.filter((g) => g.is_department));

  // Form data
  let formData = $state({
    name: '',
    namePreferred: '',
    namePronunciationHint: '',
    title: '',
    selectedGroupIds: [] as string[],
    selectedDepartmentIds: [] as string[],
  });

  // Contact methods
  interface TempContactMethod {
    id: string;
    value: string;
  }

  let contactMethods = $state<TempContactMethod[]>([{ id: crypto.randomUUID(), value: '' }]);

  // Add contact method
  function addContactMethod() {
    contactMethods = [
      ...contactMethods,
      {
        id: crypto.randomUUID(),
        value: '',
      },
    ];
  }

  // Remove contact method
  function removeContactMethod(id: string) {
    contactMethods = contactMethods.filter((cm) => cm.id !== id);
  }

  // Handle form submission
  async function handleSubmit(event?: Event) {
    event?.preventDefault();

    if (!formData.name.trim()) {
      error = 'Name is required';
      return;
    }

    loading = true;
    error = null;

    try {
      // Create the person
      const personData: CreatePersonData = {
        name: formData.name.trim(),
        name_preferred: formData.namePreferred.trim() || undefined,
        name_pronunciation_hint: formData.namePronunciationHint.trim() || undefined,
        title: formData.title.trim() || undefined,
        is_active: true,
        client_id: clientId,
      };

      const newPerson = await Person.create(personData);
      console.log('Created person:', newPerson);

      // Create contact methods
      const validContactMethods = contactMethods.filter((cm) => cm.value.trim());
      for (const cm of validContactMethods) {
        await ContactMethod.create({
          person_id: newPerson.id,
          value: cm.value.trim(),
        });
      }

      // Create group memberships
      const allGroupIds = [...formData.selectedGroupIds, ...formData.selectedDepartmentIds];
      for (const groupId of allGroupIds) {
        await PeopleGroupMembership.create({
          person_id: newPerson.id,
          people_group_id: groupId,
        });
      }

      // Navigate back to people list
      await goto(`/clients/${clientId}/people`);
    } catch (err: any) {
      error = err.message || 'Failed to create person. Please try again.';
      console.error('Failed to create person:', err);
    } finally {
      loading = false;
    }
  }

  // Cancel and go back
  function handleCancel() {
    goto(`/clients/${clientId}/people`);
  }

  // Debug the form state
  $effect(() => {
    console.log('Form state:', {
      name: formData.name,
      loading,
      isValid: formData.name.trim().length > 0,
    });
  });

  // Derived validation state
  const canSave = $derived(formData.name.trim().length > 0);

  // Set up person edit state in layout store
  $effect(() => {
    layoutActions.setPersonEditState(true, true); // editing = true, isNew = true
    layoutActions.setSavingPerson(loading);
    layoutActions.setCanSavePerson(canSave);
    layoutActions.setPersonEditCallbacks({
      onSave: handleSubmit,
      onCancel: handleCancel,
    });
    layoutActions.setPageTitle('Add New Person');

    // Cleanup on unmount
    return () => {
      layoutActions.clearPersonEditState();
      layoutActions.clearPageTitle();
    };
  });

  // Handle keyboard shortcuts
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleSubmit();
    } else if (event.key === 's' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleSubmit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleCancel();
    } else if (event.key === '.' && event.metaKey) {
      event.preventDefault();
      handleCancel();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<AppLayout currentClient={client}>
  <div class="add-person-page">
    <form onsubmit={handleSubmit} novalidate>
      {#if error}
        <div class="error-message" role="alert">
          {error}
        </div>
      {/if}

      <!-- Basic Information -->
      <section class="form-section">
        <h2>Basic Information</h2>

        <div class="form-row">
          <label for="name">Name *</label>
          <FormInput id="name" bind:value={formData.name} placeholder="Full name" required />
        </div>

        <div class="form-row">
          <label for="preferred-name">Preferred Name</label>
          <FormInput
            id="preferred-name"
            bind:value={formData.namePreferred}
            placeholder="How they prefer to be called"
          />
        </div>

        <div class="form-row">
          <label for="pronunciation">Pronunciation</label>
          <FormInput
            id="pronunciation"
            bind:value={formData.namePronunciationHint}
            placeholder="e.g., 'John Doe' → 'jon doh'"
          />
        </div>

        <div class="form-row">
          <label for="title">Title</label>
          <FormInput id="title" bind:value={formData.title} placeholder="Job title or role" />
        </div>
      </section>

      <!-- Contact Methods -->
      <section class="form-section">
        <div class="section-header">
          <h2>Contact Methods</h2>
          <CircularButton
            iconSrc={PlusIcon}
            size="small"
            onclick={addContactMethod}
            title="Add contact method"
          />
        </div>

        {#each contactMethods as method (method.id)}
          <div class="contact-method">
            <input
              type="text"
              bind:value={method.value}
              placeholder="Email, phone, or address"
              class="contact-value-input"
              aria-label="Contact value"
            />

            <CircularButton
              iconSrc={TrashIcon}
              size="small"
              variant="danger"
              onclick={() => removeContactMethod(method.id)}
              title="Remove contact method"
              disabled={contactMethods.length === 1}
            />
          </div>
        {/each}
      </section>

      <!-- Groups and Departments -->
      {#if groups.length > 0 || departments.length > 0}
        <section class="form-section">
          <h2>Groups & Departments</h2>

          {#if departments.length > 0}
            <div class="form-field">
              <label>Departments</label>
              <div class="checkbox-group">
                {#each departments as dept}
                  <label class="checkbox-label">
                    <input
                      type="checkbox"
                      value={dept.id}
                      checked={formData.selectedDepartmentIds.includes(dept.id)}
                      onchange={(e) => {
                        if (e.currentTarget.checked) {
                          formData.selectedDepartmentIds = [
                            ...formData.selectedDepartmentIds,
                            dept.id,
                          ];
                        } else {
                          formData.selectedDepartmentIds = formData.selectedDepartmentIds.filter(
                            (id) => id !== dept.id
                          );
                        }
                      }}
                    />
                    {dept.name}
                  </label>
                {/each}
              </div>
            </div>
          {/if}

          {#if groups.length > 0}
            <div class="form-field">
              <label>Groups</label>
              <div class="checkbox-group">
                {#each groups as group}
                  <label class="checkbox-label">
                    <input
                      type="checkbox"
                      value={group.id}
                      checked={formData.selectedGroupIds.includes(group.id)}
                      onchange={(e) => {
                        if (e.currentTarget.checked) {
                          formData.selectedGroupIds = [...formData.selectedGroupIds, group.id];
                        } else {
                          formData.selectedGroupIds = formData.selectedGroupIds.filter(
                            (id) => id !== group.id
                          );
                        }
                      }}
                    />
                    {group.name}
                  </label>
                {/each}
              </div>
            </div>
          {/if}
        </section>
      {/if}
    </form>
  </div>
</AppLayout>

<style>
  .add-person-page {
    max-width: 800px;
    margin: 0 auto;
    padding: 24px;
  }

  .error-message {
    background-color: rgba(255, 69, 58, 0.1);
    color: var(--accent-red);
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 24px;
    font-size: 14px;
    line-height: 1.5;
  }

  .form-section {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
  }

  .form-section h2 {
    margin: 0 0 24px 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }

  .section-header h2 {
    margin: 0;
  }

  .form-row {
    display: grid;
    grid-template-columns: 140px 1fr;
    gap: 16px;
    align-items: center;
    margin-bottom: 16px;
  }

  .form-row:last-child {
    margin-bottom: 0;
  }

  .form-row label {
    font-weight: 500;
    font-size: 14px;
    color: var(--text-secondary);
    text-align: right;
  }

  .form-field {
    margin-bottom: 20px;
  }

  .form-field:last-child {
    margin-bottom: 0;
  }

  .form-field label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    font-size: 14px;
    color: var(--text-secondary);
  }

  .contact-method {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 12px;
    align-items: center;
    margin-bottom: 12px;
  }

  .contact-method:last-child {
    margin-bottom: 0;
  }

  .contact-value-input {
    padding: 8px 12px;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    background-color: var(--bg-primary);
    color: var(--text-primary);
    font-size: 14px;
    font-family: inherit;
    line-height: 1.4;
    transition:
      border-color 0.15s ease,
      box-shadow 0.15s ease;
  }

  .contact-value-input:focus {
    outline: none;
    border-color: var(--accent-blue);
    box-shadow: 0 0 0 3px rgba(0, 163, 255, 0.1);
  }

  .contact-value-input::placeholder {
    color: var(--text-tertiary);
    opacity: 1;
  }

  .checkbox-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 14px;
    color: var(--text-primary);
    user-select: none;
  }

  .checkbox-label input[type='checkbox'] {
    cursor: pointer;
    width: 16px;
    height: 16px;
    margin: 0;
    flex-shrink: 0;
  }

  .checkbox-label:hover {
    color: var(--text-primary);
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .add-person-page {
      padding: 16px;
    }

    h1 {
      font-size: 24px;
      margin-bottom: 24px;
    }

    .form-section {
      padding: 20px;
      margin-bottom: 20px;
    }

    .form-row {
      grid-template-columns: 1fr;
      gap: 8px;
    }

    .form-row label {
      text-align: left;
    }

    .contact-method {
      grid-template-columns: 1fr;
      gap: 8px;
    }
  }
</style>
