<script lang="ts">
  /**
   * PersonForm Demo Component
   *
   * This component demonstrates how to use the unified PersonForm component
   * in different modes. It's useful for testing and as a reference implementation.
   */

  import PersonForm from './PersonForm.svelte';
  import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte';
  import type { PersonData } from '$lib/models/types/person-data';

  // Demo state
  let currentMode: 'create' | 'edit' | 'view' = 'create';
  let loading = false;
  let error: string | null = null;
  let showValidation = true;

  // Mock client ID
  const clientId = 'demo-client-123';

  // Mock person data for edit/view modes
  const mockPerson: PersonData = {
    id: 'demo-person-123',
    name: 'John Doe',
    name_preferred: 'Johnny',
    name_pronunciation_hint: 'JON-ee',
    title: 'Software Engineer',
    is_active: true,
    client_id: clientId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    contactMethods: [
      {
        id: 'cm-1',
        value: 'john.doe@example.com',
        contact_type: 'email',
        formatted_value: 'john.doe@example.com',
        person_id: 'demo-person-123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'cm-2',
        value: '(555) 123-4567',
        contact_type: 'phone',
        formatted_value: '(555) 123-4567',
        person_id: 'demo-person-123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'cm-3',
        value: '123 Main St, Anytown, ST 12345',
        contact_type: 'address',
        formatted_value: '123 Main St, Anytown, ST 12345',
        person_id: 'demo-person-123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  };

  // Mode options for the segmented control
  const modeOptions = [
    { value: 'create', label: 'Create' },
    { value: 'edit', label: 'Edit' },
    { value: 'view', label: 'View' },
  ];

  // Get person data based on current mode
  $: person = currentMode === 'create' ? null : mockPerson;

  // Event handlers
  function handleSave(_event: CustomEvent) {
    // Log save event details (demo only)

    // Simulate API call
    loading = true;
    error = null;

    setTimeout(() => {
      loading = false;
      alert(`Person ${currentMode === 'create' ? 'created' : 'updated'} successfully!`);
    }, 1000);
  }

  function handleCancel() {
    // Handle cancel event
    alert('Form cancelled');
  }

  function handleDelete(event: CustomEvent) {
    const { person } = event.detail;
    // Handle delete event

    const confirmed = confirm(`Are you sure you want to delete ${person?.name || 'this person'}?`);
    if (confirmed) {
      alert('Person deleted successfully!');
    }
  }

  // Simulate loading state
  function toggleLoading() {
    loading = !loading;
  }

  // Simulate error state
  function toggleError() {
    error = error ? null : 'This is a sample error message';
  }
</script>

<div class="demo-container">
  <h1>PersonForm Demo</h1>

  <div class="demo-controls">
    <div class="control-group">
      <label>Mode:</label>
      <SegmentedControl
        options={modeOptions}
        value={currentMode}
        on:change={(e) => (currentMode = e.detail)}
      />
    </div>

    <div class="control-group">
      <label>Options:</label>
      <div class="checkbox-controls">
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={showValidation} />
          Show Validation
        </label>
        <button class="toggle-button" on:click={toggleLoading}>
          {loading ? 'Stop Loading' : 'Simulate Loading'}
        </button>
        <button class="toggle-button" on:click={toggleError}>
          {error ? 'Clear Error' : 'Simulate Error'}
        </button>
      </div>
    </div>
  </div>

  <div class="demo-form">
    <PersonForm
      mode={currentMode}
      {person}
      {clientId}
      {loading}
      {error}
      {showValidation}
      on:save={handleSave}
      on:cancel={handleCancel}
      on:delete={handleDelete}
    />
  </div>

  <div class="demo-info">
    <h3>Current State:</h3>
    <ul>
      <li><strong>Mode:</strong> {currentMode}</li>
      <li><strong>Person ID:</strong> {person?.id || 'N/A (create mode)'}</li>
      <li><strong>Loading:</strong> {loading}</li>
      <li><strong>Error:</strong> {error || 'None'}</li>
      <li><strong>Show Validation:</strong> {showValidation}</li>
    </ul>

    <h3>Keyboard Shortcuts:</h3>
    <ul>
      <li><strong>Cmd/Ctrl + S:</strong> Save form</li>
      <li><strong>Cmd/Ctrl + Enter:</strong> Save form</li>
      <li><strong>Escape:</strong> Cancel form</li>
      <li><strong>Cmd + .:</strong> Cancel form (macOS)</li>
    </ul>
  </div>
</div>

<style>
  .demo-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px;
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 32px;
  }

  .demo-container h1 {
    grid-column: 1 / -1;
    margin: 0 0 24px 0;
    text-align: center;
    color: var(--text-primary);
  }

  .demo-controls {
    grid-column: 1 / -1;
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 8px;
    padding: 16px;
    display: flex;
    gap: 24px;
    align-items: center;
    flex-wrap: wrap;
  }

  .control-group {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .control-group label {
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
  }

  .checkbox-controls {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    font-size: 14px;
    color: var(--text-primary);
  }

  .toggle-button {
    padding: 6px 12px;
    background: var(--accent-blue);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    white-space: nowrap;
  }

  .toggle-button:hover {
    opacity: 0.9;
  }

  .demo-form {
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: 8px;
    min-height: 600px;
  }

  .demo-info {
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 8px;
    padding: 16px;
    height: fit-content;
  }

  .demo-info h3 {
    margin: 0 0 12px 0;
    color: var(--text-primary);
    font-size: 16px;
  }

  .demo-info ul {
    margin: 0 0 24px 0;
    padding-left: 16px;
  }

  .demo-info ul:last-child {
    margin-bottom: 0;
  }

  .demo-info li {
    margin-bottom: 6px;
    font-size: 14px;
    color: var(--text-secondary);
  }

  .demo-info strong {
    color: var(--text-primary);
  }

  /* Responsive layout */
  @media (max-width: 1024px) {
    .demo-container {
      grid-template-columns: 1fr;
      gap: 24px;
    }

    .demo-controls {
      flex-direction: column;
      align-items: stretch;
    }

    .control-group {
      justify-content: space-between;
    }

    .checkbox-controls {
      justify-content: flex-end;
    }
  }

  @media (max-width: 768px) {
    .demo-container {
      padding: 16px;
    }

    .control-group {
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
    }

    .checkbox-controls {
      justify-content: flex-start;
    }
  }
</style>
