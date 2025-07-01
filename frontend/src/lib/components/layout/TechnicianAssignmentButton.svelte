<script lang="ts">
  import { createPopover } from 'svelte-headlessui';
  import { fade } from 'svelte/transition';
  import { onMount } from 'svelte';
  import UserAvatar from '$lib/components/ui/UserAvatar.svelte';
  import { useUsersQuery, useUserLookup, useUpdateJobTechniciansMutation } from '$lib/api/hooks/users';
  import { technicianSelections } from '$lib/utils/persisted-store';
  import type { User } from '$lib/types/job';
  import { debugTechAssignment, debugAPI } from '$lib/utils/debug';

  export let jobId: string;
  export let assignedTechnicians: Array<User['attributes'] & { id: string }> = [];
  export let onAssignmentChange: (technicians: User[]) => void = () => {};

  const popover = createPopover();
  
  // Use TanStack Query for user data
  const usersQuery = useUsersQuery();
  const userLookup = useUserLookup();
  const updateTechniciansMutation = useUpdateJobTechniciansMutation();

  // Controlled state management - no reactive override of user selections
  let selectedUserIds: Set<string> = new Set();
  
  $: availableUsers = $usersQuery.data || [];
  $: assignedTechniciansForDisplay = userLookup.getUsersByIds(assignedTechnicians.map(t => t.id));
  $: isLoading = $updateTechniciansMutation.isPending;
  $: error = $updateTechniciansMutation.error;
  $: errorCode = error && (error as any).code;
  
  // Initialize local state from props only once
  onMount(() => {
    selectedUserIds = new Set(assignedTechnicians.map(t => t.id));
    debugTechAssignment('Initialized selectedUserIds: %o', Array.from(selectedUserIds));
  });
  
  // Track when we're in the middle of our own update to prevent reactive overrides
  let isOurUpdate = false;
  
  // Update local state only when props change externally (not from our mutations)
  let lastPropsSignature = assignedTechnicians.map(t => t.id).sort().join(',');
  $: {
    const currentSignature = assignedTechnicians.map(t => t.id).sort().join(',');
    
    // Only update if this is an external change (not from our own mutation)
    if (!isOurUpdate && !$updateTechniciansMutation.isPending && currentSignature !== lastPropsSignature) {
      debugTechAssignment('Props changed externally, updating selectedUserIds from %s to %s', lastPropsSignature, currentSignature);
      selectedUserIds = new Set(assignedTechnicians.map(t => t.id));
      lastPropsSignature = currentSignature;
    } else if (currentSignature !== lastPropsSignature) {
      debugTechAssignment('Props changed but blocked: isOurUpdate=%s, isPending=%s', isOurUpdate, $updateTechniciansMutation.isPending);
    }
  }
  
  // Store last selection for convenience
  function saveSelection(jobId: string, technicianIds: string[]) {
    technicianSelections.update(selections => ({
      ...selections,
      [jobId]: {
        technicianIds,
        lastUpdated: Date.now()
      }
    }));
  }

  // Handle checkbox changes with proper state control
  function handleUserToggle(user: User, checked: boolean) {
    // Prevent multiple clicks while loading
    if ($updateTechniciansMutation.isPending) {
      debugTechAssignment('Ignoring click - mutation already pending');
      return;
    }
    
    // Set flag to prevent reactive overrides during our update
    isOurUpdate = true;
    
    // Update local state immediately for responsive UI
    const newSelectedIds = new Set(selectedUserIds);
    if (checked) {
      newSelectedIds.add(user.id);
    } else {
      newSelectedIds.delete(user.id);
    }
    
    // Update local state immediately
    selectedUserIds = newSelectedIds;
    const technicianIds = Array.from(newSelectedIds);
    
    debugTechAssignment('User clicked %s %s, local state now: %o', 
      user.attributes.name, checked ? 'ON' : 'OFF', technicianIds);
    
    // Save selection to localStorage for convenience
    saveSelection(jobId, technicianIds);
    
    // Make API call without optimistic updates (we handle state locally)
    $updateTechniciansMutation.mutate(
      { jobId, technicianIds },
      {
        onSuccess: (response) => {
          debugAPI('API success, server returned: %o', response.technicians.map((t: any) => t.id));
          
          // Update parent component with server response
          const updatedTechnicians = userLookup.getUsersByIds(
            response.technicians.map((t: any) => t.id)
          );
          onAssignmentChange(updatedTechnicians);
          
          // Sync local state with server response and update signature
          const serverIds = new Set(response.technicians.map((t: any) => t.id));
          selectedUserIds = serverIds;
          lastPropsSignature = Array.from(serverIds).sort().join(',');
          
          debugTechAssignment('Synced with server, final state: %o', Array.from(serverIds));
          
          // Clear our update flag
          isOurUpdate = false;
        },
        onError: (error: any) => {
          debugAPI('API error, reverting to original state: %o', error);
          
          // Revert local state on error
          const originalIds = new Set(assignedTechnicians.map(t => t.id));
          selectedUserIds = originalIds;
          
          debugTechAssignment('Reverted to original state: %o', Array.from(originalIds));
          
          // Notify parent of failure (keep original state)
          const originalTechnicians = userLookup.getUsersByIds(
            assignedTechnicians.map(t => t.id)
          );
          onAssignmentChange(originalTechnicians);
          
          // Clear our update flag
          isOurUpdate = false;
        }
      }
    );
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
              <label class="user-checkbox">
                <input 
                  type="checkbox" 
                  checked={selectedUserIds.has(user.id)}
                  disabled={isLoading}
                  on:change={(e) => handleUserToggle(user, e.currentTarget.checked)}
                  class="checkbox-input" 
                />
                <UserAvatar {user} size="small" />
                <span class="user-name">{user.attributes.name}</span>
              </label>
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