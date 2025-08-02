<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import AppLayout from '$lib/components/layout/AppLayout.svelte';
  import ChromelessInput from '$lib/components/ui/ChromelessInput.svelte';
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

  let contactMethods = $state<TempContactMethod[]>([
    { id: crypto.randomUUID(), value: '' },
    { id: crypto.randomUUID(), value: '' },
  ]);

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
    if (contactMethods.length > 2) {
      contactMethods = contactMethods.filter((cm) => cm.id !== id);
    }
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
    layoutActions.setPageTitle('New Person');

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
  <div class="new-contact-page">
    <div class="contact-card">
      <form onsubmit={handleSubmit} novalidate>
        {#if error}
          <div class="error-message" role="alert">
            {error}
          </div>
        {/if}

        <!-- Person Icon -->
        <div class="person-icon">
          <img src="/icons/person.circle.fill.svg" alt="Person" width="64" height="64" />
        </div>

        <!-- Name Field -->
        <div class="field-group">
          <ChromelessInput
            id="name"
            bind:value={formData.name}
            placeholder="Full name"
            customClass="name-input"
            required
            autoFocus
          />
        </div>

        <!-- Title Field -->
        <div class="field-group">
          <ChromelessInput
            id="title"
            bind:value={formData.title}
            placeholder="Job title or role"
            customClass="title-input"
          />
        </div>

        <!-- Contact Methods -->
        <div class="contact-methods">
          {#each contactMethods as method, index (method.id)}
            <div class="contact-method">
              <ChromelessInput
                bind:value={method.value}
                placeholder={index === 0 ? 'Email or phone' : 'Address or other contact method'}
                customClass="contact-input"
                type="text"
                ariaLabel={`Contact method ${index + 1}`}
              />

              <CircularButton
                iconSrc={TrashIcon}
                size="small"
                variant="danger"
                onclick={() => removeContactMethod(method.id)}
                title="Remove contact method"
                disabled={contactMethods.length <= 2}
              />
            </div>
          {/each}

          <div class="add-contact-button">
            <CircularButton
              iconSrc={PlusIcon}
              size="small"
              onclick={addContactMethod}
              title="Add contact method"
            />
          </div>
        </div>

        <!-- Groups and Departments -->
        {#if groups.length > 0 || departments.length > 0}
          <div class="groups-section">
            {#if departments.length > 0}
              <div class="form-field">
                <label class="field-label">Departments</label>
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
                <label class="field-label">Groups</label>
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
          </div>
        {/if}
      </form>
    </div>
  </div>
</AppLayout>

<style>
  .new-contact-page {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    min-height: 100vh;
    padding: 32px 16px;
  }

  .contact-card {
    max-width: 600px;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
  }

  .error-message {
    background-color: rgba(255, 69, 58, 0.1);
    color: var(--accent-red);
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    line-height: 1.5;
    width: 100%;
    text-align: center;
  }

  .person-icon {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 8px;
  }

  .person-icon img {
    opacity: 0.7;
    filter: grayscale(0.3);
  }

  .field-group {
    width: 100%;
    margin-bottom: 16px;
    display: flex;
    justify-content: center;
  }

  .field-group:global(.name-input) {
    font-size: 24px;
    font-weight: 600;
    text-align: center;
  }

  .field-group:global(.title-input) {
    font-size: 18px;
    font-weight: 400;
    text-align: center;
    color: var(--text-secondary);
  }

  :global(.name-input) {
    font-size: 24px;
    font-weight: 600;
    text-align: center;
    padding: 8px 16px;
    border-radius: 6px;
  }

  :global(.title-input) {
    font-size: 18px;
    font-weight: 400;
    text-align: center;
    color: var(--text-secondary);
    padding: 6px 16px;
    border-radius: 6px;
  }

  :global(.contact-input) {
    font-size: 16px;
    padding: 8px 12px;
    border-radius: 6px;
  }

  .contact-methods {
    width: 100%;
    margin-top: 32px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .contact-method {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
  }

  .contact-method :global(.chromeless-input) {
    flex: 1;
  }

  .add-contact-button {
    display: flex;
    justify-content: center;
    margin-top: 8px;
  }

  .groups-section {
    width: 100%;
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px solid var(--border-secondary);
  }

  .form-field {
    margin-bottom: 24px;
  }

  .form-field:last-child {
    margin-bottom: 0;
  }

  .field-label {
    display: block;
    margin-bottom: 12px;
    font-weight: 600;
    font-size: 16px;
    color: var(--text-primary);
  }

  .checkbox-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    font-size: 16px;
    color: var(--text-primary);
    user-select: none;
    padding: 8px 0;
  }

  .checkbox-label input[type='checkbox'] {
    cursor: pointer;
    width: 18px;
    height: 18px;
    margin: 0;
    flex-shrink: 0;
  }

  .checkbox-label:hover {
    color: var(--text-primary);
    background-color: var(--bg-hover, rgba(0, 0, 0, 0.05));
    border-radius: 6px;
    padding: 8px 12px;
    margin: 0 -12px;
  }

  /* Focus states for better accessibility */
  :global(.name-input:focus),
  :global(.title-input:focus),
  :global(.contact-input:focus) {
    background-color: rgba(0, 0, 0, 0.9);
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .new-contact-page {
      padding: 24px 16px;
    }

    .contact-card {
      gap: 20px;
    }

    :global(.name-input) {
      font-size: 22px;
    }

    :global(.title-input) {
      font-size: 16px;
    }

    .contact-method {
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
    }

    .checkbox-label:hover {
      padding: 8px 0;
      margin: 0;
      background-color: transparent;
    }
  }

  @media (max-width: 480px) {
    .new-contact-page {
      padding: 16px 12px;
    }

    :global(.name-input) {
      font-size: 20px;
    }

    :global(.title-input) {
      font-size: 15px;
    }
  }
</style>
