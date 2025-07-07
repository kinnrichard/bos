<script lang="ts">
  import PopoverOptionList from '$lib/components/ui/PopoverOptionList.svelte';
  import BasePopoverButton from '$lib/components/ui/BasePopoverButton.svelte';
  import UserAvatar from '$lib/components/ui/UserAvatar.svelte';
  import type { User } from '$lib/types/job';

  // Mock data for testing
  const mockUsers = [
    {
      id: '1',
      attributes: {
        name: 'Test Technician',
        email: 'test@example.com',
        initials: 'TT',
        avatar_style: 'blue'
      }
    },
    {
      id: '2', 
      attributes: {
        name: 'Demo User',
        email: 'demo@example.com',
        initials: 'DU',
        avatar_style: 'green'
      }
    },
    {
      id: '3',
      attributes: {
        name: 'Sample Person',
        email: 'sample@example.com', 
        initials: 'SP',
        avatar_style: 'purple'
      }
    }
  ];

  // Local state - this simulates the optimistic updates
  let localSelectedIds: Set<string> = new Set();
  let isLoading = false;

  // Simulated optimistic technicians derived from local state
  $: optimisticTechnicians = Array.from(localSelectedIds)
    .map(id => mockUsers.find(user => user.id === id))
    .filter((user): user is User => Boolean(user));

  // Handle technician toggle - immediate local update (idiomatic Svelte)
  function handleUserToggle(user: User, isCurrentlySelected: boolean) {
    const newSelectedIds = new Set(localSelectedIds);
    
    if (isCurrentlySelected) {
      newSelectedIds.delete(user.id);
    } else {
      newSelectedIds.add(user.id);
    }
    
    localSelectedIds = newSelectedIds;
    
    // Simulate API call with loading state
    isLoading = true;
    setTimeout(() => {
      isLoading = false;
      console.log('Simulated API update completed');
    }, 500);
  }

  // Display logic
  $: displayTechnicians = optimisticTechnicians.slice(0, 2);
  $: extraCount = Math.max(0, optimisticTechnicians.length - 2);
  $: hasAssignments = optimisticTechnicians.length > 0;

  let popover: any;
</script>

<svelte:head>
  <title>Technician Assignment Test</title>
</svelte:head>

<div class="test-container">
  <h1>Technician Assignment Test</h1>
  <p>This tests the idiomatic Svelte reactive patterns for real-time checkmark updates.</p>
  
  <div class="test-section">
    <h2>Current Implementation (Fixed)</h2>
    <p>Checkmarks should update immediately with button content - no lag!</p>
    
    <BasePopoverButton 
      bind:popover
      title={hasAssignments ? `Technicians: ${optimisticTechnicians.map(t => t?.attributes?.name).filter(Boolean).join(', ')}` : 'Technicians'}
      loading={isLoading}
      panelWidth="max-content"
      panelPosition="center"
      buttonClass={hasAssignments ? 'has-assignments' : ''}
    >
      <svelte:fragment slot="button-content">
        {#if hasAssignments}
          <!-- Show assigned technician avatars -->
          <div class="assigned-avatars">
            {#each displayTechnicians as technician}
              <UserAvatar user={technician} size="xs" />
            {/each}
            {#if extraCount > 0}
              <div class="extra-count">+{extraCount}</div>
            {/if}
          </div>
        {:else}
          <!-- Show add-person icon when no assignments -->
          <div class="add-person-placeholder">Add</div>
        {/if}
      </svelte:fragment>

      <svelte:fragment slot="panel-content" let:loading>
        <h3 class="assignment-title">Assigned To</h3>
        
        <PopoverOptionList
          options={mockUsers}
          loading={loading}
          onOptionClick={(user) => {
            const isCurrentlySelected = localSelectedIds.has(user.id);
            handleUserToggle(user, isCurrentlySelected);
          }}
        >
          <svelte:fragment slot="option-content" let:option>
            {@const isSelected = localSelectedIds.has(option.id)}
            
            <div class="technician-avatar">
              <UserAvatar user={option} size="xs" />
            </div>
            <span class="technician-name">{option.attributes.name}</span>
            
            <!-- Checkmark in same reactive scope for immediate updates -->
            <div class="checkmark-area">
              {#if isSelected}
                <div class="checkmark">✓</div>
              {/if}
            </div>
          </svelte:fragment>
        </PopoverOptionList>
      </svelte:fragment>
    </BasePopoverButton>
  </div>

  <div class="debug-section">
    <h3>Debug Info</h3>
    <p><strong>Selected IDs:</strong> {Array.from(localSelectedIds).join(', ') || 'None'}</p>
    <p><strong>Optimistic Technicians:</strong> {optimisticTechnicians.map(t => t?.attributes?.name).filter(Boolean).join(', ') || 'None'}</p>
    <p><strong>Loading:</strong> {isLoading}</p>
    
    <div class="test-buttons">
      <button on:click={() => localSelectedIds = new Set()}>Clear All</button>
      <button on:click={() => localSelectedIds = new Set(['1', '2'])}>Select First Two</button>
      <button on:click={() => localSelectedIds = new Set(['1', '2', '3'])}>Select All</button>
    </div>
  </div>
</div>

<style>
  .test-container {
    max-width: 800px;
    margin: 2rem auto;
    padding: 2rem;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .test-section {
    background: #f8f9fa;
    padding: 1.5rem;
    border-radius: 8px;
    margin: 1rem 0;
  }

  .debug-section {
    background: #e9ecef;
    padding: 1rem;
    border-radius: 6px;
    margin-top: 2rem;
  }

  .test-buttons {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .test-buttons button {
    padding: 0.5rem 1rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: white;
    cursor: pointer;
  }

  .test-buttons button:hover {
    background: #f0f0f0;
  }

  /* Button styling */
  :global(.popover-button.has-assignments) {
    border-radius: 18px !important;
    width: auto !important;
    min-width: 36px !important;
    padding: 0 6px !important;
  }

  .assigned-avatars {
    display: flex;
    align-items: center;
    gap: -2px;
  }

  .extra-count {
    background-color: #6c757d;
    color: white;
    font-size: 10px;
    font-weight: 600;
    width: 20px;
    height: 20px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: 2px;
  }

  .add-person-placeholder {
    width: 20px;
    height: 20px;
    background: #dee2e6;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: #6c757d;
  }

  .assignment-title {
    color: #212529;
    margin: 0 0 6px 0;
    font-size: 14px;
    font-weight: 600;
  }

  .technician-avatar {
    flex-shrink: 0;
    margin-right: 8px;
  }

  .technician-name {
    font-size: 14px;
    color: #6c757d;
    line-height: 1.3;
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }

  .checkmark-area {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: 14px;
  }

  .checkmark {
    color: #28a745;
    font-weight: bold;
    font-size: 12px;
  }
</style>