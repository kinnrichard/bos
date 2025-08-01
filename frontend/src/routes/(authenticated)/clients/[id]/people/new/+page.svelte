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
  let loading = false;
  let error: string | null = null;

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
  let name = '';
  let namePreferred = '';
  let namePronunciationHint = '';
  let title = '';
  let isActive = true;
  let selectedGroupIds: string[] = [];
  let selectedDepartmentIds: string[] = [];

  // Contact methods
  interface TempContactMethod {
    id: string;
    type: 'email' | 'phone' | 'address';
    value: string;
    isPrimary: boolean;
  }

  let contactMethods: TempContactMethod[] = [
    { id: crypto.randomUUID(), type: 'email', value: '', isPrimary: true },
  ];

  // Add contact method
  function addContactMethod() {
    contactMethods = [
      ...contactMethods,
      {
        id: crypto.randomUUID(),
        type: 'email',
        value: '',
        isPrimary: contactMethods.length === 0,
      },
    ];
  }

  // Remove contact method
  function removeContactMethod(id: string) {
    const wasOnlyPrimary =
      contactMethods.find((cm) => cm.id === id)?.isPrimary &&
      contactMethods.filter((cm) => cm.isPrimary).length === 1;

    contactMethods = contactMethods.filter((cm) => cm.id !== id);

    // If we removed the only primary, make the first one primary
    if (wasOnlyPrimary && contactMethods.length > 0) {
      contactMethods[0].isPrimary = true;
    }
  }

  // Toggle primary status
  function togglePrimary(id: string) {
    contactMethods = contactMethods.map((cm) => ({
      ...cm,
      isPrimary: cm.id === id,
    }));
  }

  // Handle form submission
  async function handleSubmit(event: Event) {
    event.preventDefault();

    if (!name.trim()) {
      error = 'Name is required';
      return;
    }

    loading = true;
    error = null;

    try {
      // Create the person
      const personData: CreatePersonData = {
        name: name.trim(),
        name_preferred: namePreferred.trim() || undefined,
        name_pronunciation_hint: namePronunciationHint.trim() || undefined,
        title: title.trim() || undefined,
        is_active: isActive,
        client_id: clientId,
      };

      const newPerson = await Person.create(personData);

      // Create contact methods
      const validContactMethods = contactMethods.filter((cm) => cm.value.trim());
      for (const cm of validContactMethods) {
        await ContactMethod.create({
          person_id: newPerson.id,
          contact_method_type: cm.type,
          value: cm.value.trim(),
          is_primary: cm.isPrimary,
        });
      }

      // Create group memberships
      const allGroupIds = [...selectedGroupIds, ...selectedDepartmentIds];
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

  // Contact type options
  const contactTypeOptions = [
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'address', label: 'Address' },
  ];

  // Status options
  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];
</script>

<AppLayout currentClient={client}>
  <div class="add-person-page">
    <h1>Add New Person</h1>

    <form on:submit={handleSubmit}>
      {#if error}
        <div class="error-message" role="alert">
          {error}
        </div>
      {/if}

      <!-- Basic Information -->
      <section class="form-section">
        <h2>Basic Information</h2>

        <FormInput label="Name" bind:value={name} required placeholder="Full name" />

        <FormInput
          label="Preferred Name"
          bind:value={namePreferred}
          placeholder="How they prefer to be called"
          helperText="Optional: If different from their full name"
        />

        <FormInput
          label="Pronunciation"
          bind:value={namePronunciationHint}
          placeholder="e.g., 'John Doe' → 'jon doh'"
          helperText="Optional: Help others pronounce their name correctly"
        />

        <FormInput label="Title" bind:value={title} placeholder="Job title or role" />

        <div class="form-field">
          <label>Status</label>
          <SegmentedControl
            options={statusOptions}
            value={isActive ? 'active' : 'inactive'}
            on:change={(e) => (isActive = e.detail === 'active')}
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
            <select
              bind:value={method.type}
              class="contact-type-select"
              aria-label="Contact method type"
            >
              {#each contactTypeOptions as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>

            <input
              type={method.type === 'email' ? 'email' : 'text'}
              bind:value={method.value}
              placeholder={method.type === 'email'
                ? 'email@example.com'
                : method.type === 'phone'
                  ? '(555) 123-4567'
                  : '123 Main St, City, ST 12345'}
              class="contact-value-input"
              aria-label="{method.type} value"
            />

            <label class="primary-checkbox">
              <input
                type="checkbox"
                checked={method.isPrimary}
                on:change={() => togglePrimary(method.id)}
              />
              Primary
            </label>

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
                      on:change={(e) => {
                        if (e.currentTarget.checked) {
                          selectedDepartmentIds = [...selectedDepartmentIds, dept.id];
                        } else {
                          selectedDepartmentIds = selectedDepartmentIds.filter(
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
                      on:change={(e) => {
                        if (e.currentTarget.checked) {
                          selectedGroupIds = [...selectedGroupIds, group.id];
                        } else {
                          selectedGroupIds = selectedGroupIds.filter((id) => id !== group.id);
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
        <button type="submit" class="submit-button" disabled={loading || !name.trim()}>
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
    grid-template-columns: 120px 1fr auto auto;
    gap: 0.75rem;
    align-items: center;
    margin-bottom: 1rem;
  }

  .contact-type-select {
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 0.375rem;
    background-color: var(--background-color);
    color: var(--text-color);
    font-size: 0.95rem;
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

  .primary-checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    cursor: pointer;
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
