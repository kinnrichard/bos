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
  
  // Local state for immediate UI responsiveness (optimistic updates)
  let localSelectedIds: Set<string> = new Set();
  let optimisticTechnicians: User[] = [];
  
  // Consolidated reactive logic to eliminate race conditions
  $: {
    // First: sync localSelectedIds from server when safe (not actively updating)
    if (!$updateTechniciansMutation.isPending && assignedTechnicians?.length >= 0) {
      localSelectedIds = new Set(assignedTechnicians.map(t => t?.id).filter(Boolean));
    }
    
    // Then: always derive optimisticTechnicians from localSelectedIds using user lookup
    // This ensures consistent data structure and eliminates the type guard issue
    const userList = $usersQuery.data || [];
    optimisticTechnicians = Array.from(localSelectedIds)
      .map(id => userList.find(user => user.id === id))
      .filter(Boolean) as User[];
  }

  // Handle checkbox changes - optimistic updates, no loading blocking
  function handleUserToggle(user: User, checked: boolean) {
    // Remove loading guard to allow optimistic updates
    
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

  // Display logic for button content - use optimistic data
  $: displayTechnicians = optimisticTechnicians.slice(0, 2);
  $: extraCount = Math.max(0, optimisticTechnicians.length - 2);
  $: hasAssignments = optimisticTechnicians.length > 0;
</script>

<div class="technician-assignment-popover">
  <button 
    type="button"
    class="assignment-button"
    class:has-assignments={hasAssignments}
    use:popover.button
    title={hasAssignments ? `Technicians: ${optimisticTechnicians.map(t => t?.attributes?.name).filter(Boolean).join(', ')}` : 'Technicians'}
  >
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
        <h3 class="assignment-title">Assigned To</h3>
        
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
          <div class="technician-options">
            {#each availableUsers as user}
              {#if user?.id && user?.attributes?.name}
                <button 
                  class="technician-option" 
                  type="button"
                  aria-pressed={localSelectedIds.has(user.id)}
                  on:click={() => handleUserToggle(user, !localSelectedIds.has(user.id))}
                >
                  <div class="technician-avatar">
                    <UserAvatar {user} size="xs" />
                  </div>
                  <span class="technician-name">{user.attributes.name}</span>
                  <div class="technician-checkmark-area">
                    {#if localSelectedIds.has(user.id)}
                      <img src="/icons/checkmark.svg" alt="Selected" class="technician-indicator" />
                    {/if}
                  </div>
                </button>
              {/if}
            {/each}
          </div>
        {/if}

        <!-- Removed 'Updating...' loading indicator for optimistic UX -->
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
    min-width: 200px;
    max-width: 320px;
    width: max-content;
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
    padding: 12px;
  }

  .assignment-title {
    color: var(--text-primary);
    margin: 0 0 6px 0;
    font-size: 14px;
    font-weight: 600;
  }

  .error-message {
    color: var(--accent-red);
    font-size: 12px;
    margin-bottom: 8px;
    text-align: center;
  }

  /* Technician options styling - matching job status format */
  .technician-options {
    display: flex;
    flex-direction: column;
    max-height: min(400px, 50vh);
    overflow-y: auto;
  }

  .technician-option {
    display: flex;
    align-items: center;
    padding: 6px 12px;
    background: none;
    border: none;
    border-radius: 8px;
    transition: background-color 0.15s ease;
    text-align: left;
    width: 100%;
  }

  .technician-option:hover {
    background-color: var(--bg-tertiary);
  }

  .technician-avatar {
    flex-shrink: 0;
    margin-right: 8px;
  }

  .technician-name {
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.3;
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    margin-right: 14px;
  }

  .technician-checkmark-area {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .technician-indicator {
    width: 14px;
    height: 14px;
    /* No filter - keep natural color for regular checkmark */
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
      min-width: 180px;
      max-width: 280px;
    }
    
    .technician-options {
      max-height: min(300px, 40vh);
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
    .technician-option {
      transition: none;
    }
  }
</style>