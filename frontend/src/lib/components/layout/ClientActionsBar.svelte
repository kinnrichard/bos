<script lang="ts">
  import TextButton from '$lib/components/ui/TextButton.svelte';
  import { layout } from '$lib/stores/layout.svelte';

  interface Props {
    disabled?: boolean;
  }

  const { disabled = false }: Props = $props();

  // Get state from layout store
  const isEditing = $derived(layout.isEditingClient);
  const isNewClient = $derived(layout.isNewClient);
  const isSaving = $derived(layout.isSavingClient);
  const canSave = $derived(layout.canSaveClient);
  const callbacks = $derived(layout.clientEditCallbacks);

  // Handlers
  function handleEdit() {
    if (callbacks?.onEdit) {
      callbacks.onEdit();
    }
  }

  function handleSave() {
    if (callbacks?.onSave) {
      callbacks.onSave();
    }
  }

  function handleCancel() {
    if (callbacks?.onCancel) {
      callbacks.onCancel();
    }
  }
</script>

{#if callbacks}
  <div class="client-actions" role="toolbar" aria-label="Client actions">
    {#if isEditing}
      <TextButton
        variant="danger"
        size="normal"
        onclick={handleCancel}
        disabled={disabled || isSaving}
        ariaLabel="Cancel editing"
      >
        Cancel
      </TextButton>
      <TextButton
        variant="primary"
        size="normal"
        onclick={handleSave}
        disabled={disabled || isSaving || !canSave}
        loading={isSaving}
        ariaLabel={isNewClient ? 'Create client' : 'Save changes'}
      >
        {#if isSaving}
          Saving...
        {:else if isNewClient}
          Create
        {:else}
          Done
        {/if}
      </TextButton>
    {:else}
      <TextButton
        variant="primary"
        size="normal"
        onclick={handleEdit}
        {disabled}
        ariaLabel="Edit client"
      >
        Edit
      </TextButton>
    {/if}
  </div>
{/if}

<style>
  .client-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .client-actions {
      gap: 4px;
    }
  }
</style>
