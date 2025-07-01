<script lang="ts">
  import { createPopover } from 'svelte-headlessui';
  import { fade } from 'svelte/transition';
  import UserAvatar from '$lib/components/ui/UserAvatar.svelte';
  import { useUsersQuery, useUserLookup } from '$lib/api/hooks/users';
  import { useJobQuery, useUpdateJobTechniciansMutation } from '$lib/api/hooks/jobs';
  import type { User } from '$lib/types/job';
  import { debugTechAssignment } from '$lib/utils/debug';

  export let jobId: string;
  
  // Optional props to provide initial data while job query loads
  export let initialTechnicians: Array<{id: string}> = [];

  const popover = createPopover();
  
  // Use TanStack Query for all data - single source of truth
  const usersQuery = useUsersQuery();
  const userLookup = useUserLookup();
  const jobQuery = useJobQuery(jobId);
  const updateTechniciansMutation = useUpdateJobTechniciansMutation();

  // Derived state from TanStack Query cache - fallback to initial data
  $: job = $jobQuery.data; // Now returns PopulatedJob directly
  $: availableUsers = $usersQuery.data || [];
  // Use populated technicians from job.technicians instead of relationships
  $: assignedTechnicians = job?.technicians || initialTechnicians;
  $: assignedTechniciansForDisplay = assignedTechnicians;
  
  $: isLoading = $updateTechniciansMutation.isPending;
  $: error = $updateTechniciansMutation.error;
  $: errorCode = error && (error as any).code;
  
  // Local state for immediate UI responsiveness
  let localSelectedIds: Set<string> = new Set();
  
  // Keep local state in sync with server data
  $: {
    if (!isLoading && assignedTechnicians?.length >= 0) {
      localSelectedIds = new Set(assignedTechnicians.map(t => t?.id).filter(Boolean));
    }
  }

  // Handle checkbox changes - simple and clean
  function handleUserToggle(user: User, checked: boolean) {
    if (isLoading) {
      debugTechAssignment('Ignoring click - mutation already pending');
      return;
    }
    
    // Ensure user has required data
    if (!user?.id || !user?.attributes?.name) {
      debugTechAssignment('Invalid user data, ignoring click: %o', user);
      return;
    }
    
    // Ensure jobId is valid
    if (!jobId) {
      debugTechAssignment('Invalid jobId, ignoring click: %o', jobId);
      return;
    }
    
    // Update local state immediately for UI responsiveness
    const newSelectedIds = new Set(localSelectedIds);
    if (checked) {
      newSelectedIds.add(user.id);
    } else {
      newSelectedIds.delete(user.id);
    }
    localSelectedIds = newSelectedIds;
    
    const technicianIds = Array.from(newSelectedIds);
    
    debugTechAssignment('User clicked %s %s, updating to: %o', 
      user.attributes.name, checked ? 'ON' : 'OFF', technicianIds);
    
    // TanStack Query mutation handles API call and cache updates
    try {
      $updateTechniciansMutation.mutate({ jobId, technicianIds });
    } catch (error) {
      debugTechAssignment('Error during mutation: %o', error);
      console.error('TechnicianAssignmentButton mutation error:', error);
    }
  }

  // Display logic for button content
  $: displayTechnicians = assignedTechniciansForDisplay.slice(0, 2);
  $: extraCount = Math.max(0, assignedTechniciansForDisplay.length - 2);
  $: hasAssignments = assignedTechniciansForDisplay.length > 0;
</script>

<div class="technician-assignment-popover">
  <button 
    type="button"
    class="assignment-button"
    class:has-assignments={hasAssignments}
    use:popover.button
    title={hasAssignments ? `Assigned to: ${assignedTechniciansForDisplay.map(t => t?.attributes?.name).filter(Boolean).join(', ')}` : 'Assign technicians'}
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
        
        {#if $usersQuery.isError}
          <div class="error-message">Failed to load users</div>
        {:else if error}
          <div class="error-message">
            {#if errorCode === 'INVALID_CSRF_TOKEN'}
              Session expired - please try again
            {:else}
              Failed to update assignment - please try again
            {/if}
          </div>
        {/if}

        {#if $usersQuery.isLoading}
          <div class="loading-indicator">Loading users...</div>
        {:else}
          <div class="user-checkboxes" class:loading={isLoading}>
            {#each availableUsers as user}
              {#if user?.id && user?.attributes?.name}
                <label class="user-checkbox">
                  <input 
                    type="checkbox" 
                    checked={localSelectedIds.has(user.id)}
                    disabled={isLoading}
                    on:change={(e) => handleUserToggle(user, e.currentTarget.checked)}
                    class="checkbox-input" 
                  />
                  <UserAvatar {user} size="small" />
                  <span class="user-name">{user.attributes.name}</span>
                </label>
              {/if}
            {/each}
          </div>
        {/if}

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