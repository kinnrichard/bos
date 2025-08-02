<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import AppLayout from '$lib/components/layout/AppLayout.svelte';
  import ChromelessInput from '$lib/components/ui/ChromelessInput.svelte';
  import { Person } from '$lib/models/person';
  import { ContactMethod } from '$lib/models/contact-method';
  import { PeopleGroupMembership } from '$lib/models/people-group-membership';
  import { ReactivePeopleGroup } from '$lib/models/reactive-people-group';
  import { ReactiveClient } from '$lib/models/reactive-client';
  import type { CreatePersonData } from '$lib/models/types/person-data';
  import { layoutActions } from '$lib/stores/layout.svelte';
  import {
    normalizeContact,
    getContactTypeIcon,
    getContactTypeLabel,
  } from '$lib/utils/contactNormalizer';
  import type { NormalizedContact } from '$lib/utils/contactNormalizer';

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
    normalized?: NormalizedContact | null;
  }

  let contactMethods = $state<TempContactMethod[]>([
    { id: crypto.randomUUID(), value: '', normalized: null },
    { id: crypto.randomUUID(), value: '', normalized: null },
  ]);

  // Add contact method
  function addContactMethod() {
    contactMethods = [
      ...contactMethods,
      {
        id: crypto.randomUUID(),
        value: '',
        normalized: null,
      },
    ];
  }

  // Handle contact normalization on blur
  function handleContactBlur(method: TempContactMethod, index: number, _event: Event) {
    const normalized = normalizeContact(method.value);
    method.normalized = normalized;

    // Update the input value to show the normalized format for email and phone
    if (
      normalized &&
      (normalized.contact_type === 'email' || normalized.contact_type === 'phone')
    ) {
      method.value = normalized.formatted_value;
    }

    // Resize all inputs after normalization
    setTimeout(() => resizeInput(), 0); // Timeout to ensure value is updated

    // Remove empty fields on blur (keep at least 2 fields)
    if (!method.value.trim() && contactMethods.length > 2) {
      // Don't remove if it's the last field
      if (index !== contactMethods.length - 1) {
        contactMethods = contactMethods.filter((cm) => cm.id !== method.id);
      }
    }
  }

  // Handle input in contact method fields
  function handleContactInput(method: TempContactMethod, index: number, _event: Event) {
    // If typing in the last field and it has content, add a new empty field
    if (index === contactMethods.length - 1 && method.value.trim()) {
      // Check if we need to add a new field (don't add if one already exists with no value)
      const hasEmptyField = contactMethods.some((cm, i) => i !== index && !cm.value.trim());
      if (!hasEmptyField) {
        addContactMethod();
      }
    }

    // Dynamically resize all inputs based on content
    resizeInput();
  }

  // Calculate and set appropriate width for all inputs based on the widest content
  function resizeInput(_input?: HTMLInputElement) {
    // Get all contact inputs
    const inputs = document.querySelectorAll('.contact-input');
    let maxWidth = 0; // Start with 0 to find actual needed width

    // Find the widest required width among all inputs
    inputs.forEach((inp) => {
      if (inp instanceof HTMLInputElement) {
        // Create a temporary span to measure text width
        const span = document.createElement('span');
        span.style.visibility = 'hidden';
        span.style.position = 'absolute';
        span.style.whiteSpace = 'nowrap';
        span.style.font = window.getComputedStyle(inp).font;
        span.style.padding = window.getComputedStyle(inp).padding;

        // Measure both the value and placeholder to get the needed width
        const textToMeasure = inp.value || inp.placeholder || '';
        span.textContent = textToMeasure;

        document.body.appendChild(span);
        const textWidth = span.getBoundingClientRect().width;
        document.body.removeChild(span);

        const requiredWidth = textWidth + 30; // +30 for padding and some breathing room
        if (requiredWidth > maxWidth) {
          maxWidth = requiredWidth;
        }
      }
    });

    // Apply constraints - minimum for usability, maximum for viewport
    const minWidth = 180; // Minimum for usability
    const maxAllowedWidth = window.innerWidth * 0.8; // 80% of viewport
    const finalWidth = Math.max(minWidth, Math.min(maxWidth, maxAllowedWidth));

    // Set all inputs to the same width
    inputs.forEach((inp) => {
      if (inp instanceof HTMLInputElement) {
        inp.style.width = `${finalWidth}px`;
      }
    });
  }

  // Initialize input widths on mount
  function initializeInputWidths() {
    // Wait for DOM to be ready
    setTimeout(() => {
      resizeInput();
    }, 0);
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

      // Create contact methods with normalized data
      const validContactMethods = contactMethods.filter((cm) => cm.value.trim());
      for (const cm of validContactMethods) {
        const normalized = cm.normalized || normalizeContact(cm.value);

        await ContactMethod.create({
          person_id: newPerson.id,
          value: cm.value.trim(),
          contact_type: normalized?.contact_type,
          formatted_value: normalized?.formatted_value || cm.value.trim(),
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
    } catch (err) {
      error = (err as Error).message || 'Failed to create person. Please try again.';
    } finally {
      loading = false;
    }
  }

  // Cancel and go back
  function handleCancel() {
    goto(`/clients/${clientId}/people`);
  }

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

  // Initialize input widths when contact methods change
  $effect(() => {
    // Trigger on contact methods change
    contactMethods;
    initializeInputWidths();
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

        <!-- Divider -->
        <hr class="divider" />

        <!-- Contact Methods -->
        <div class="contact-methods">
          {#each contactMethods as method, index (method.id)}
            <div class="contact-method">
              {#if method.normalized}
                <span
                  class="contact-type-indicator"
                  title={getContactTypeLabel(method.normalized.contact_type)}
                >
                  <img
                    src={getContactTypeIcon(method.normalized.contact_type)}
                    alt={getContactTypeLabel(method.normalized.contact_type)}
                    width="16"
                    height="16"
                  />
                </span>
              {:else}
                <span class="contact-type-indicator placeholder"></span>
              {/if}

              <ChromelessInput
                bind:value={method.value}
                placeholder="Email, phone, or address"
                customClass="contact-input"
                type="text"
                ariaLabel={`Contact method ${index + 1}`}
                oninput={(e) => handleContactInput(method, index, e)}
                onblur={(e) => handleContactBlur(method, index, e)}
              />
            </div>
          {/each}
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
    padding: 0px 24px;
  }

  .contact-card {
    width: auto;
    min-width: 250px;
    max-width: 90%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding-top: 16px;
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
    margin-bottom: 0px;
    display: flex;
    justify-content: center;
  }

  .field-group :global(.name-input) {
    font-size: 18px;
    font-weight: 600;
    text-align: center;
    padding: 0 6px !important;
  }

  .field-group :global(.title-input) {
    font-size: 14px;
    font-weight: 400;
    text-align: center;
    color: var(--text-secondary);
    padding: 0 6px !important;
  }

  :global(.contact-input) {
    font-size: 14px;
    padding: 0 6px !important;
    border-radius: 6px;
    transition: width 0.2s ease;
    min-width: 0; /* Allow dynamic sizing */
  }

  hr.divider {
    width: 100%;
    border: none;
    border-top: 1px solid var(--border-primary);
    margin: 16px 0;
  }

  .contact-methods {
    width: 100%;
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .contact-method {
    display: flex;
    align-items: center;
    width: auto;
    min-width: 0;
  }

  .contact-type-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    margin-right: 4px;
    opacity: 0.6;
    transition: opacity 0.2s ease;
    flex-shrink: 0;
  }

  .contact-type-indicator.placeholder {
    opacity: 0;
  }

  .contact-type-indicator:not(.placeholder):hover {
    opacity: 1;
  }

  .contact-type-indicator img {
    filter: var(--icon-filter, none);
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
    font-size: 14px;
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

  /* Ensure text stays centered in all states for name and title inputs */
  :global(.name-input:focus) {
    text-align: center;
  }

  :global(.title-input:focus) {
    text-align: center;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .new-contact-page {
      padding: 0px 24px;
    }

    .contact-card {
      gap: 20px;
    }

    :global(.name-input) {
      font-size: 16px;
    }

    :global(.title-input) {
      font-size: 14px;
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

  @media (max-width: 768px) {
    .contact-card {
      min-width: 100%;
      width: 100%;
      max-width: 100%;
    }

    :global(.contact-input) {
      min-width: 200px;
    }
  }

  @media (max-width: 480px) {
    .new-contact-page {
      padding: 0px 12px;
    }

    :global(.name-input) {
      font-size: 15px;
    }

    :global(.title-input) {
      font-size: 14px;
    }

    :global(.contact-input) {
      min-width: 150px;
    }
  }
</style>
