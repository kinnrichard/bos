<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import AppLayout from '$lib/components/layout/AppLayout.svelte';
  import FormInput from '$lib/components/ui/FormInput.svelte';
  import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte';
  import CircularButton from '$lib/components/ui/CircularButton.svelte';
  import LoadingSkeleton from '$lib/components/ui/LoadingSkeleton.svelte';
  import BasePopover from '$lib/components/ui/BasePopover.svelte';
  import { ReactivePerson } from '$lib/models/reactive-person';
  import { ReactiveClient } from '$lib/models/reactive-client';
  import { ReactivePeopleGroup } from '$lib/models/reactive-people-group';
  import { Person } from '$lib/models/person';
  import { ContactMethod } from '$lib/models/contact-method';
  import { PeopleGroupMembership } from '$lib/models/people-group-membership';
  import { peoplePermissionHelpers } from '$lib/stores/peoplePermissions.svelte';
  import type { UpdatePersonData } from '$lib/models/types/person-data';
  import { layoutActions } from '$lib/stores/layout.svelte';

  // Icon paths
  const PlusIcon = '/icons/plus.svg';
  const TrashIcon = '/icons/trash-red.svg';
  const MoreIcon = '/icons/info.svg';
  const PersonIcon = '/icons/person.circle.fill.svg';

  let clientId = $page.params.id;
  let personId = $page.params.personId;

  let isEditing = false;
  let isSaving = false;
  let showDeleteConfirm = false;
  let showMoreActions = false;
  let error: string | null = null;

  // Load client
  const clientQuery = $derived(ReactiveClient.find(clientId));
  const client = $derived(clientQuery?.data);

  // Load person with relationships
  const personQuery = $derived(ReactivePerson.includes('contactMethods').find(personId));
  const person = $derived(personQuery?.data);
  const loading = $derived(personQuery?.isLoading || false);
  const queryError = $derived(personQuery?.error);

  // Load all groups for editing
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

  // Contact methods for editing
  interface TempContactMethod {
    id?: string;
    type: 'email' | 'phone' | 'address';
    value: string;
    isPrimary: boolean;
    _destroy?: boolean;
  }

  let contactMethods = $state<TempContactMethod[]>([]);

  // Update form data when person loads
  $effect(() => {
    if (person && !isEditing) {
      formData.name = person.name || '';
      formData.namePreferred = person.name_preferred || '';
      formData.namePronunciationHint = person.name_pronunciation_hint || '';
      formData.title = person.title || '';
      formData.isActive = person.is_active ?? true;

      // Set contact methods
      if (person.contactMethods?.length) {
        contactMethods = person.contactMethods.map((cm) => ({
          id: cm.id,
          type: cm.contact_type as 'email' | 'phone' | 'address',
          value: cm.value,
          isPrimary: false, // Primary field no longer exists
        }));
      } else {
        contactMethods = [];
      }

      // Set groups
      // TODO: peopleGroups relationship not available in Zero.js schema
      // Groups would need to be loaded separately through PeopleGroupMembership
      formData.selectedDepartmentIds = [];
      formData.selectedGroupIds = [];
    }
  });

  // Handle edit mode
  function handleEdit() {
    isEditing = true;
    error = null;
  }

  function handleCancel() {
    isEditing = false;
    error = null;
    // Reset form data from person
    if (person) {
      formData.name = person.name || '';
      formData.namePreferred = person.name_preferred || '';
      formData.namePronunciationHint = person.name_pronunciation_hint || '';
      formData.title = person.title || '';
      formData.isActive = person.is_active ?? true;

      // Reset contact methods
      if (person.contactMethods?.length) {
        contactMethods = person.contactMethods.map((cm) => ({
          id: cm.id,
          type: cm.contact_type as 'email' | 'phone' | 'address',
          value: cm.value,
          isPrimary: false, // Primary field no longer exists
        }));
      }
    }
  }

  // Handle save
  async function handleSave() {
    if (!formData.name.trim()) {
      error = 'Name is required';
      return;
    }

    isSaving = true;
    error = null;

    try {
      // Update person
      const updateData: UpdatePersonData = {
        name: formData.name.trim(),
        name_preferred: formData.namePreferred.trim() || undefined,
        name_pronunciation_hint: formData.namePronunciationHint.trim() || undefined,
        title: formData.title.trim() || undefined,
        is_active: formData.isActive,
      };

      await Person.update(personId, updateData);

      // Handle contact methods
      const validContactMethods = contactMethods.filter((cm) => cm.value.trim() || cm.id);

      // Delete removed contact methods
      if (person?.contactMethods) {
        const existingIds = validContactMethods.map((cm) => cm.id).filter(Boolean);
        const toDelete = person.contactMethods.filter((cm) => !existingIds.includes(cm.id));
        for (const cm of toDelete) {
          await ContactMethod.destroy(cm.id);
        }
      }

      // Update or create contact methods
      for (const cm of validContactMethods) {
        if (cm.value.trim()) {
          if (cm.id) {
            // Update existing
            await ContactMethod.update(cm.id, {
              contact_type: cm.type,
              value: cm.value.trim(),
            });
          } else {
            // Create new
            await ContactMethod.create({
              person_id: personId,
              contact_type: cm.type,
              value: cm.value.trim(),
            });
          }
        }
      }

      // Handle group memberships
      // TODO: peopleGroups relationship not available in Zero.js schema
      // Always delete and recreate memberships for now
      const memberships = await PeopleGroupMembership.where({ person_id: personId }).all();
      for (const membership of memberships) {
        await PeopleGroupMembership.destroy(membership.id);
      }

      // Create new memberships
      const allGroupIds = [...formData.selectedGroupIds, ...formData.selectedDepartmentIds];
      for (const groupId of allGroupIds) {
        await PeopleGroupMembership.create({
          person_id: personId,
          people_group_id: groupId,
        });
      }

      isEditing = false;
      // The reactive query will automatically update
    } catch (err: any) {
      error = err.message || 'Failed to save changes. Please try again.';
      console.error('Failed to update person:', err);
    } finally {
      isSaving = false;
    }
  }

  // Handle delete
  async function handleDelete() {
    try {
      await Person.destroy(personId);
      goto(`/clients/${clientId}/people`);
    } catch (err: any) {
      error = err.message || 'Failed to delete person. Please try again.';
      showDeleteConfirm = false;
    }
  }

  // Contact method management
  function addContactMethod() {
    contactMethods = [
      ...contactMethods,
      {
        type: 'email',
        value: '',
        isPrimary: contactMethods.length === 0,
      },
    ];
  }

  function removeContactMethod(index: number) {
    const wasOnlyPrimary =
      contactMethods[index]?.isPrimary && contactMethods.filter((cm) => cm.isPrimary).length === 1;

    contactMethods = contactMethods.filter((_, i) => i !== index);

    // If we removed the only primary, make the first one primary
    if (wasOnlyPrimary && contactMethods.length > 0) {
      contactMethods[0].isPrimary = true;
    }
  }

  function togglePrimary(index: number) {
    contactMethods = contactMethods.map((cm, i) => ({
      ...cm,
      isPrimary: i === index,
    }));
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

  // Permission checks
  const canDelete = $derived(person ? peoplePermissionHelpers.canDeletePerson(person) : false);

  // Setup edit state in layout
  $effect(() => {
    layoutActions.setClientEditState(isEditing, false);
    layoutActions.setSavingClient(isSaving);
    layoutActions.setCanSaveClient(formData.name.trim().length > 0);
    layoutActions.setClientEditCallbacks({
      onEdit: handleEdit,
      onSave: handleSave,
      onCancel: handleCancel,
    });

    return () => {
      layoutActions.clearClientEditState();
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
        <button class="retry-button" on:click={() => window.location.reload()}>Try Again</button>
      </div>
    {:else if person}
      {#if !isEditing}
        <!-- View Mode -->
        <div class="person-header">
          <div class="person-icon">
            <img src={PersonIcon} alt="" />
          </div>

          <div class="person-title-section">
            <h1>{person.name_preferred || person.name}</h1>
            {#if person.name_pronunciation_hint}
              <p class="pronunciation">({person.name_pronunciation_hint})</p>
            {/if}
            {#if person.title}
              <p class="title">{person.title}</p>
            {/if}
            {#if !person.is_active}
              <span class="inactive-badge">Inactive</span>
            {/if}
          </div>

          <div class="header-actions">
            {#if canDelete}
              <BasePopover bind:isOpen={showMoreActions}>
                <CircularButton slot="trigger" iconSrc={MoreIcon} variant="ghost" size="medium" />
                <div slot="content" class="more-actions-menu">
                  <button
                    class="delete-action"
                    on:click={() => {
                      showMoreActions = false;
                      showDeleteConfirm = true;
                    }}
                  >
                    <span class="icon"><img src={TrashIcon} alt="" /></span>
                    Delete Person
                  </button>
                </div>
              </BasePopover>
            {/if}
          </div>
        </div>

        {#if error}
          <div class="error-message" role="alert">
            {error}
          </div>
        {/if}

        <div class="person-details">
          {#if person.contactMethods?.length}
            <section class="detail-section">
              <h2>Contact Information</h2>
              <div class="contact-list">
                {#each person.contactMethods as cm}
                  <div class="contact-item">
                    <span class="contact-type">{cm.contact_type}:</span>
                    <span class="contact-value">
                      {cm.formatted_value || cm.value}
                    </span>
                  </div>
                {/each}
              </div>
            </section>
          {/if}

          {#if false}
            <!-- TODO: Groups section disabled - peopleGroups relationship not available in Zero.js schema -->
            <section class="detail-section">
              <h2>Groups & Departments</h2>
              <div class="group-list">
                <!-- Groups would be displayed here -->
              </div>
            </section>
          {/if}
        </div>
      {:else}
        <!-- Edit Mode -->
        <h1>Edit Person</h1>

        <form on:submit|preventDefault={handleSave}>
          {#if error}
            <div class="error-message" role="alert">
              {error}
            </div>
          {/if}

          <section class="form-section">
            <h2>Basic Information</h2>

            <FormInput label="Name" bind:value={formData.name} required placeholder="Full name" />

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

            {#each contactMethods as method, index}
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
                    on:change={() => togglePrimary(index)}
                  />
                  Primary
                </label>

                <CircularButton
                  iconSrc={TrashIcon}
                  size="small"
                  variant="danger"
                  on:click={() => removeContactMethod(index)}
                  title="Remove contact method"
                />
              </div>
            {/each}
          </section>

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
                              formData.selectedDepartmentIds =
                                formData.selectedDepartmentIds.filter((id) => id !== dept.id);
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
        </form>
      {/if}
    {/if}

    <!-- Delete Confirmation Dialog -->
    {#if showDeleteConfirm}
      <div class="modal-overlay" on:click={() => (showDeleteConfirm = false)}>
        <div class="modal-content" on:click|stopPropagation>
          <h2>Delete Person?</h2>
          <p>
            Are you sure you want to delete {person?.name_preferred || person?.name}? This action
            cannot be undone.
          </p>
          <div class="modal-actions">
            <button class="cancel-button" on:click={() => (showDeleteConfirm = false)}>
              Cancel
            </button>
            <button class="delete-button" on:click={handleDelete}> Delete </button>
          </div>
        </div>
      </div>
    {/if}
  </div>
</AppLayout>

<style>
  .person-detail-page {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  .person-header {
    display: flex;
    align-items: flex-start;
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .person-icon {
    width: 80px;
    height: 80px;
    color: var(--primary-color);
    flex-shrink: 0;
  }

  .person-icon img {
    width: 100%;
    height: 100%;
  }

  .person-title-section {
    flex: 1;
  }

  .person-title-section h1 {
    margin: 0 0 0.25rem 0;
    color: var(--text-color);
  }

  .pronunciation {
    color: var(--secondary-text-color);
    font-size: 0.95rem;
    margin-bottom: 0.25rem;
  }

  .title {
    color: var(--secondary-text-color);
    margin-bottom: 0.5rem;
  }

  .inactive-badge {
    display: inline-block;
    background-color: var(--warning-background);
    color: var(--warning-color);
    padding: 0.25rem 0.75rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .more-actions-menu {
    padding: 0.5rem;
    min-width: 150px;
  }

  .delete-action {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.5rem;
    background: none;
    border: none;
    color: var(--error-color);
    cursor: pointer;
    font-size: 0.95rem;
    text-align: left;
    border-radius: 0.25rem;
  }

  .delete-action:hover {
    background-color: var(--hover-background);
  }

  .delete-action .icon {
    width: 16px;
    height: 16px;
  }

  .delete-action .icon img {
    width: 100%;
    height: 100%;
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

  .person-details {
    margin-top: 2rem;
  }

  .detail-section {
    background-color: var(--card-background);
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .detail-section h2 {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
    color: var(--text-color);
  }

  .contact-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .contact-item {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .contact-type {
    font-weight: 500;
    text-transform: capitalize;
    min-width: 80px;
  }

  .contact-value {
    color: var(--secondary-text-color);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .primary-badge {
    background-color: var(--primary-color);
    color: white;
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .group-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .group-badge {
    background-color: var(--secondary-color);
    color: var(--text-color);
    padding: 0.25rem 0.75rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
  }

  .group-badge.department {
    background-color: var(--primary-color);
    color: white;
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

  /* Modal styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background-color: var(--card-background);
    border-radius: 0.5rem;
    padding: 2rem;
    max-width: 400px;
    width: 90%;
  }

  .modal-content h2 {
    margin: 0 0 1rem 0;
    color: var(--text-color);
  }

  .modal-content p {
    margin-bottom: 1.5rem;
    color: var(--secondary-text-color);
  }

  .modal-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
  }

  .cancel-button {
    padding: 0.75rem 1.5rem;
    background-color: var(--secondary-color);
    color: var(--text-color);
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 1rem;
  }

  .delete-button {
    padding: 0.75rem 1.5rem;
    background-color: var(--error-color);
    color: white;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 1rem;
  }

  .cancel-button:hover,
  .delete-button:hover {
    opacity: 0.9;
  }

  @media (max-width: 640px) {
    .person-header {
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .contact-method {
      grid-template-columns: 1fr;
    }
  }
</style>
