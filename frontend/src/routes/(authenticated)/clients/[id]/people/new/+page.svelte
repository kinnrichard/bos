<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import AppLayout from '$lib/components/layout/AppLayout.svelte';
  import FormInput from '$lib/components/ui/FormInput.svelte';
  import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte';
  import CircularButton from '$lib/components/ui/CircularButton.svelte';
  import { Person } from '$lib/models/person';
  import { ContactMethod } from '$lib/models/contact-method';
  import { PeopleGroupMembership } from '$lib/models/people-group-membership';
  import { ReactivePeopleGroup } from '$lib/models/reactive-people-group';
  import { ReactiveClient } from '$lib/models/reactive-client';
  import type { CreatePersonData } from '$lib/models/types/person-data';

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
    isActive: true,
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
  async function handleSubmit(event: Event) {
    event.preventDefault();

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
        is_active: formData.isActive,
        client_id: clientId,
      };

      const newPerson = await Person.create(personData);

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

  // Status options
  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

  // Debug the form state
  $effect(() => {
    console.log('Form state:', {
      name: formData.name,
      loading,
      isValid: formData.name.trim().length > 0,
    });
  });
</script>

<AppLayout currentClient={client}>
  <div class="add-person-page">
    <h1>Add New Person</h1>

    <form on:submit={handleSubmit} novalidate>
      {#if error}
        <div class="error-message" role="alert">
          {error}
        </div>
      {/if}

      <!-- Basic Information -->
      <section class="form-section">
        <h2>Basic Information</h2>

        <FormInput label="Name" bind:value={formData.name} placeholder="Full name" />

        <FormInput
          label="Preferred Name"
          bind:value={formData.namePreferred}
          placeholder="How they prefer to be called"
          helperText="Optional: If different from their full name"
        />

        <FormInput
          label="Pronunciation"
          bind:value={formData.namePronunciationHint}
          placeholder="e.g., 'John Doe' → 'jon doh'"
          helperText="Optional: Help others pronounce their name correctly"
        />

        <FormInput label="Title" bind:value={formData.title} placeholder="Job title or role" />

        <div class="form-field">
          <label>Status</label>
          <SegmentedControl
            options={statusOptions}
            value={formData.isActive ? 'active' : 'inactive'}
            on:change={(e) => (formData.isActive = e.detail === 'active')}
          />
        </div>
      </section>

      <!-- Contact Methods -->
      <section class="form-section">
        <div class="section-header">
          <h2>Contact Methods</h2>
          <CircularButton
            iconSrc={PlusIcon}
            size="small"
            on:click={addContactMethod}
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
              on:click={() => removeContactMethod(method.id)}
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
                      on:change={(e) => {
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
                      on:change={(e) => {
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

      <!-- Form Actions -->
      <div class="form-actions">
        <button type="button" class="cancel-button" on:click={handleCancel} disabled={loading}>
          Cancel
        </button>
        <button
          type="submit"
          class="submit-button"
          disabled={loading || formData.name.trim().length === 0}
        >
          {loading ? 'Creating...' : 'Create Person'}
        </button>
      </div>
    </form>
  </div>
</AppLayout>

<style>
  .add-person-page {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  h1 {
    margin-bottom: 2rem;
    color: var(--text-color);
  }

  .error-message {
    background-color: var(--error-background);
    color: var(--error-color);
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .form-section {
    background-color: var(--card-background);
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .form-section h2 {
    margin: 0 0 1.5rem 0;
    font-size: 1.25rem;
    color: var(--text-color);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .section-header h2 {
    margin: 0;
  }

  .form-field {
    margin-bottom: 1.5rem;
  }

  .form-field:last-child {
    margin-bottom: 0;
  }

  .form-field label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: var(--text-color);
  }

  .contact-method {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.75rem;
    align-items: center;
    margin-bottom: 1rem;
  }

  .contact-value-input {
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 0.375rem;
    background-color: var(--background-color);
    color: var(--text-color);
    font-size: 0.95rem;
  }

  .contact-value-input:focus {
    outline: none;
    border-color: var(--primary-color);
  }

  .checkbox-group {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-size: 0.95rem;
  }

  .checkbox-label input[type='checkbox'] {
    cursor: pointer;
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 2rem;
  }

  .cancel-button,
  .submit-button {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 0.375rem;
    font-size: 1rem;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .cancel-button {
    background-color: var(--secondary-color);
    color: var(--text-color);
  }

  .submit-button {
    background-color: var(--primary-color);
    color: white;
  }

  .cancel-button:hover:not(:disabled),
  .submit-button:hover:not(:disabled) {
    opacity: 0.9;
  }

  .cancel-button:disabled,
  .submit-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    .contact-method {
      grid-template-columns: 1fr;
    }

    .form-actions {
      flex-direction: column-reverse;
    }

    .cancel-button,
    .submit-button {
      width: 100%;
    }
  }
</style>
