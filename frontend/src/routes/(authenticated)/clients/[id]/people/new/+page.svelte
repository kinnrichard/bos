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

    <form onsubmit={handleSubmit} novalidate>
      {#if error}
        <div class="error-message" role="alert">
          {error}
        </div>
      {/if}

      <!-- Basic Information -->
      <section class="form-section">
        <h2>Basic Information</h2>

        <div class="form-field">
          <label for="name">Name *</label>
          <FormInput id="name" bind:value={formData.name} placeholder="Full name" required />
        </div>

        <div class="form-field">
          <label for="preferred-name">Preferred Name</label>
          <FormInput
            id="preferred-name"
            bind:value={formData.namePreferred}
            placeholder="How they prefer to be called"
          />
          <p class="helper-text">Optional: If different from their full name</p>
        </div>

        <div class="form-field">
          <label for="pronunciation">Pronunciation</label>
          <FormInput
            id="pronunciation"
            bind:value={formData.namePronunciationHint}
            placeholder="e.g., 'John Doe' → 'jon doh'"
          />
          <p class="helper-text">Optional: Help others pronounce their name correctly</p>
        </div>

        <div class="form-field">
          <label for="title">Title</label>
          <FormInput id="title" bind:value={formData.title} placeholder="Job title or role" />
        </div>

        <div class="form-field">
          <label>Status</label>
          <SegmentedControl
            options={statusOptions}
            value={formData.isActive ? 'active' : 'inactive'}
            onchange={(e) => (formData.isActive = e.detail === 'active')}
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

      <!-- Form Actions -->
      <div class="form-actions">
        <button type="button" class="cancel-button" onclick={handleCancel} disabled={loading}>
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
    padding: 24px;
  }

  h1 {
    font-size: 32px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 32px 0;
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

  .helper-text {
    font-size: 12px;
    color: var(--text-tertiary);
    margin-top: 4px;
    line-height: 1.4;
  }

  .form-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 32px;
  }

  .cancel-button,
  .submit-button {
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .cancel-button {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .cancel-button:hover:not(:disabled) {
    background-color: #48484a;
  }

  .submit-button {
    background-color: var(--accent-blue);
    color: white;
  }

  .submit-button:hover:not(:disabled) {
    background-color: var(--accent-blue-hover);
  }

  .cancel-button:disabled,
  .submit-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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

    .contact-method {
      grid-template-columns: 1fr;
      gap: 8px;
    }

    .form-actions {
      flex-direction: column-reverse;
      margin-top: 24px;
    }

    .cancel-button,
    .submit-button {
      width: 100%;
    }
  }
</style>
