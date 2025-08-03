<script lang="ts">
  import ContactItem from './ContactItem.svelte';
  import CircularButton from '$lib/components/ui/CircularButton.svelte';
  import { normalizeContact } from '$lib/utils/shared/contactNormalizer';
  import type { NormalizedContact } from '$lib/utils/shared/contactNormalizer';
  import { resizeInputs, type DynamicWidthConfig } from '$lib/utils/person/dynamicWidth';

  interface Props {
    mode?: 'create' | 'edit' | 'view';
    contactMethods?: Array<{ id: string; value: string; normalized?: NormalizedContact | null }>;
    onContactMethodsChange?:
      | ((
          methods: Array<{ id: string; value: string; normalized?: NormalizedContact | null }>
        ) => void)
      | undefined;
    dynamicWidthConfig?: DynamicWidthConfig | undefined;
    showValidation?: boolean;
  }

  let {
    mode = 'create',
    contactMethods = $bindable([]),
    onContactMethodsChange = undefined,
    dynamicWidthConfig = undefined,
    showValidation = false,
  }: Props = $props();

  const PlusIcon = '/icons/plus.svg';

  // Add a new contact method
  function addContactMethod() {
    const newMethod = {
      id: crypto.randomUUID(),
      value: '',
      normalized: null,
    };

    contactMethods = [...contactMethods, newMethod];
    onContactMethodsChange?.(contactMethods);

    // Immediately resize inputs after adding to prevent flash
    if (dynamicWidthConfig) {
      requestAnimationFrame(() => {
        resizeInputs(dynamicWidthConfig);
      });
    }
  }

  // Handle contact input changes
  function handleContactInput(method: (typeof contactMethods)[0], index: number, _event: Event) {
    // If typing in the last field and it has content, add a new empty field
    if (index === contactMethods.length - 1 && method.value.trim()) {
      // Check if we need to add a new field (don't add if one already exists with no value)
      const hasEmptyField = contactMethods.some((cm, i) => i !== index && !cm.value.trim());
      if (!hasEmptyField) {
        addContactMethod();
      }
    }

    // Trigger dynamic resize if configured
    if (dynamicWidthConfig) {
      resizeInputs(dynamicWidthConfig);
    }
  }

  // Handle contact blur events
  function handleContactBlur(method: (typeof contactMethods)[0], index: number, _event: Event) {
    const normalized = normalizeContact(method.value);
    method.normalized = normalized;

    // Update the input value to show the normalized format for email and phone
    if (
      normalized &&
      (normalized.contact_type === 'email' || normalized.contact_type === 'phone')
    ) {
      method.value = normalized.formatted_value;
    }

    // Trigger resize after normalization
    if (dynamicWidthConfig) {
      setTimeout(() => resizeInputs(dynamicWidthConfig), 0); // Timeout to ensure value is updated
    }

    // Remove empty fields on blur (keep at least 2 fields for create mode, 1 for edit)
    const minFields = mode === 'create' ? 2 : 1;
    if (!method.value.trim() && contactMethods.length > minFields) {
      // Don't remove if it's the last field
      if (index !== contactMethods.length - 1) {
        contactMethods = contactMethods.filter((cm) => cm.id !== method.id);
        onContactMethodsChange?.(contactMethods);
      }
    }
  }

  // Remove a specific contact method
  function removeContactMethod(index: number) {
    contactMethods = contactMethods.filter((_, i) => i !== index);
    onContactMethodsChange?.(contactMethods);
  }

  // Ensure minimum contact methods for create mode
  $effect(() => {
    if (mode === 'create' && contactMethods.length < 2) {
      const needed = 2 - contactMethods.length;
      for (let i = 0; i < needed; i++) {
        contactMethods = [
          ...contactMethods,
          {
            id: crypto.randomUUID(),
            value: '',
            normalized: null,
          },
        ];
      }
    }
  });
</script>

<div class="contact-methods-section">
  {#if mode !== 'view'}
    <div class="section-header">
      <h3>Contact Methods</h3>
      {#if mode === 'edit'}
        <CircularButton
          iconSrc={PlusIcon}
          size="small"
          on:click={addContactMethod}
          title="Add contact method"
        />
      {/if}
    </div>
  {:else}
    <h3>Contact Information</h3>
  {/if}

  <div class="contact-methods-list">
    {#each contactMethods as method, index (method.id)}
      <div class="contact-method-row">
        <ContactItem
          bind:value={method.value}
          {mode}
          {showValidation}
          ariaLabel={`Contact method ${index + 1}`}
          onInput={(e) => handleContactInput(method, index, e)}
          onBlur={(e) => handleContactBlur(method, index, e)}
        />

        {#if mode === 'edit' && contactMethods.length > 1}
          <CircularButton
            iconSrc="/icons/trash-red.svg"
            size="small"
            variant="danger"
            on:click={() => removeContactMethod(index)}
            title="Remove contact method"
          />
        {/if}
      </div>
    {/each}

    {#if contactMethods.length === 0}
      <div class="no-contacts">
        <p>No contact information</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .contact-methods-section {
    width: 100%;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .section-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }

  h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .contact-methods-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .contact-method-row {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
  }

  .no-contacts {
    text-align: center;
    padding: 24px;
    color: var(--text-secondary);
  }

  .no-contacts p {
    margin: 0;
    font-style: italic;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .contact-method-row {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
    }

    .section-header {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
    }
  }
</style>
