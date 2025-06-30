<script lang="ts">
  import { createPopover } from 'svelte-headlessui';
  import { fade } from 'svelte/transition';
  import { onMount } from 'svelte';
  import UserAvatar from '$lib/components/ui/UserAvatar.svelte';
  import { usersService } from '$lib/api/users';
  import { jobsService } from '$lib/api/jobs';
  import type { User } from '$lib/types/job';

  export let jobId: string;
  export let assignedTechnicians: Array<User['attributes'] & { id: string }> = [];
  export let onAssignmentChange: (technicians: User[]) => void = () => {};

  const popover = createPopover();

  // State
  let availableUsers: User[] = [];
  let selectedUserIds: Set<string> = new Set();
  let isLoading = false;
  let error = '';

  // Initialize selected users from props
  $: selectedUserIds = new Set(assignedTechnicians.map(t => t.id));

  // Convert assigned technicians to User format for display
  $: assignedTechniciansForDisplay = assignedTechnicians.map(tech => ({
    id: tech.id,
    type: 'users' as const,
    attributes: {
      name: tech.name,
      email: tech.email,
      role: tech.role,
      initials: tech.initials,
      avatar_style: tech.avatar_style,
      created_at: tech.created_at,
      updated_at: tech.updated_at
    }
  }));

  // Load available users when component mounts
  onMount(async () => {
    try {
      availableUsers = await usersService.getUsers();
    } catch (err) {
      console.error('Failed to load users:', err);
      error = 'Failed to load users';
    }
  });

  // Handle checkbox changes with optimistic updates
  async function handleUserToggle(user: User, checked: boolean) {
    const newSelectedIds = new Set(selectedUserIds);
    
    if (checked) {
      newSelectedIds.add(user.id);
    } else {
      newSelectedIds.delete(user.id);
    }

    // Optimistic update
    selectedUserIds = newSelectedIds;
    const updatedTechnicians = availableUsers.filter(u => newSelectedIds.has(u.id));
    onAssignmentChange(updatedTechnicians);

    // Persist to server
    try {
      isLoading = true;
      error = '';
      await jobsService.updateJobTechnicians(jobId, Array.from(newSelectedIds));
      console.log('Technician assignment updated successfully');
    } catch (err: any) {
      console.error('Failed to update technician assignment:', err);
      
      // Show appropriate error message
      if (err.code === 'INVALID_CSRF_TOKEN') {
        error = 'Session expired - please try again';
      } else {
        error = 'Failed to update assignment - please try again';
      }
      
      // Rollback on error
      selectedUserIds = new Set(assignedTechnicians.map(t => t.id));
      onAssignmentChange(assignedTechnicians);
    } finally {
      isLoading = false;
    }
  }

  // Display logic for button content
  $: displayTechnicians = assignedTechniciansForDisplay.slice(0, 2);
  $: extraCount = Math.max(0, assignedTechniciansForDisplay.length - 2);
  $: hasAssignments = assignedTechniciansForDisplay.length > 0;
</script>

<div class="technician-assignment-popover">
  <button 
    class="assignment-button"
    class:has-assignments={hasAssignments}
    use:popover.button
    title={hasAssignments ? `Assigned to: ${assignedTechniciansForDisplay.map(t => t.attributes.name).join(', ')}` : 'Assign technicians'}
  >
    {#if hasAssignments}
      <!-- Show assigned technician avatars -->
      <div class="assigned-avatars">
        {#each displayTechnicians as technician}
          <UserAvatar user={technician} size="small" />
        {/each}
        {#if extraCount > 0}
          <div class="extra-count">+{extraCount}</div>
        {/if}
      </div>
    {:else}
      <!-- Show add-person icon when no assignments -->
      <img src="/icons/add-person.svg" alt="Assign technicians" class="add-person-icon" />
    {/if}
  </button>

  {#if $popover.expanded}
    <div 
      class="assignment-panel"
      use:popover.panel
      in:fade={{ duration: 0 }}
      out:fade={{ duration: 150 }}
    >
      <div class="assignment-content">
        <h3 class="assignment-title">Assigned to…</h3>
        
        {#if error}
          <div class="error-message">{error}</div>
        {/if}

        <div class="user-checkboxes" class:loading={isLoading}>
          {#each availableUsers as user}
            <label class="user-checkbox">
              <input 
                type="checkbox" 
                checked={selectedUserIds.has(user.id)}
                disabled={isLoading}
                on:change={(e) => handleUserToggle(user, e.target.checked)}
                class="checkbox-input" 
              />
              <UserAvatar {user} size="small" />
              <span class="user-name">{user.attributes.name}</span>
            </label>
          {/each}
        </div>

        {#if isLoading}
          <div class="loading-indicator">Updating...</div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .technician-assignment-popover {
    position: relative;
  }

  .assignment-button {
    width: 36px;
    height: 36px;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
    position: relative;
    padding: 0;
  }

  .assignment-button:hover {
    background-color: var(--bg-tertiary);
    border-color: var(--accent-blue);
  }

  .assignment-button.has-assignments {
    border-radius: 18px;
    width: auto;
    min-width: 36px;
    padding: 0 6px;
  }

  .assigned-avatars {
    display: flex;
    align-items: center;
    gap: -2px; /* Slight overlap for compact display */
  }

  .extra-count {
    background-color: var(--text-secondary);
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

  .add-person-icon {
    width: 20px;
    height: 20px;
    opacity: 0.7;
  }

  .assignment-panel {
    position: absolute;
    top: calc(100% + 12px);
    left: 50%;
    transform: translateX(-50%);
    width: 200px;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    z-index: var(--z-popover);
  }

  /* Arrow/tail pointing up to the button */
  .assignment-panel::before {
    content: '';
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 12px solid transparent;
    border-right: 12px solid transparent;
    border-bottom: 12px solid var(--border-primary);
  }

  .assignment-panel::after {
    content: '';
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-bottom: 10px solid var(--bg-secondary);
  }

  .assignment-content {
    padding: 16px;
  }

  .assignment-title {
    color: var(--text-primary);
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
  }

  .error-message {
    color: var(--accent-red);
    font-size: 12px;
    margin-bottom: 8px;
    text-align: center;
  }

  .user-checkboxes {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 200px;
    overflow-y: auto;
  }

  .user-checkboxes.loading {
    opacity: 0.6;
    pointer-events: none;
  }

  .user-checkbox {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    cursor: pointer;
    border-radius: 4px;
    transition: background-color 0.15s ease;
  }

  .user-checkbox:hover {
    background-color: var(--bg-tertiary);
  }

  .checkbox-input {
    width: 16px;
    height: 16px;
    accent-color: var(--accent-blue);
    flex-shrink: 0;
  }

  .user-name {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.2;
    flex: 1;
  }

  .loading-indicator {
    text-align: center;
    font-size: 12px;
    color: var(--text-tertiary);
    margin-top: 8px;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .assignment-panel {
      width: 180px;
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .assignment-button {
      border-width: 2px;
    }
  }

  /* Accessibility improvements */
  @media (prefers-reduced-motion: reduce) {
    .assignment-button,
    .user-checkbox {
      transition: none;
    }
  }
</style>