<script lang="ts">
  import HeadlessPopoverButton from '$lib/components/ui/HeadlessPopoverButton.svelte';
  import PopoverOptionList from '$lib/components/ui/PopoverOptionList.svelte';
  import UserAvatar from '$lib/components/ui/UserAvatar.svelte';
  import { useUsersQuery, useUserLookup } from '$lib/api/hooks/users';
  import { useJobQuery, useUpdateJobTechniciansMutation } from '$lib/api/hooks/jobs';
  import type { User } from '$lib/types/job';
  import { debugTechAssignment } from '$lib/utils/debug';
  import { POPOVER_CONSTANTS, POPOVER_ERRORS } from '$lib/utils/popover-constants';
  import { getPopoverErrorMessage, validateUserData, createIdSet } from '$lib/utils/popover-utils';
  import { tick } from 'svelte';
  import '$lib/styles/popover-common.css';

  export let jobId: string;
  
  // Optional props to provide initial data while job query loads
  export let initialTechnicians: Array<{id: string}> = [];

  let popover: any;
  
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
  $: errorMessage = getPopoverErrorMessage(error);
  
  // Local state for immediate UI responsiveness (optimistic updates)
  let localSelectedIds: Set<string> = new Set();
  let optimisticTechnicians: User[] = [];
  
  // Sync with server data only when server data actually changes (not on every local update)
  // This prevents unnecessary re-renders that cause hover flicker
  let lastServerDataHash = '';
  $: {
    const currentServerIds = assignedTechnicians?.map(t => t?.id).filter(Boolean) || [];
    const currentHash = currentServerIds.sort().join(',');
    
    // Only update localSelectedIds if server data actually changed
    if (currentHash !== lastServerDataHash) {
      lastServerDataHash = currentHash;
      localSelectedIds = new Set(currentServerIds);
    }
  }
  
  // Derive optimistic display data separately - this only updates when users list or localSelectedIds change
  $: {
    const userList = $usersQuery.data || [];
    optimisticTechnicians = Array.from(localSelectedIds)
      .map(id => userList.find(user => user.id === id))
      .filter(Boolean) as User[];
  }

  // Handle checkbox changes - optimistic updates, no loading blocking
  async function handleUserToggle(user: User, checked: boolean) {
    // Remove loading guard to allow optimistic updates
    
    // Ensure user has required data
    if (!validateUserData(user)) {
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
    
    // Wait for next tick to batch reactive updates before triggering mutation
    // This prevents multiple render cycles that could interrupt hover states
    await tick();
    
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

<HeadlessPopoverButton 
  bind:popover
  title={hasAssignments ? `Technicians: ${optimisticTechnicians.map(t => t?.attributes?.name).filter(Boolean).join(', ')}` : 'Technicians'}
  error={errorMessage}
  loading={isLoading}
  panelWidth="max-content"
  panelPosition="center"
  topOffset={POPOVER_CONSTANTS.DEFAULT_TOP_OFFSET}
  contentPadding={POPOVER_CONSTANTS.COMPACT_CONTENT_PADDING}
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
      <img src={POPOVER_CONSTANTS.ADD_PERSON_ICON} alt="Assign technicians" class="add-person-icon" />
    {/if}
  </svelte:fragment>

  <svelte:fragment slot="panel-content" let:error let:loading>
    <h3 class="popover-title">Assigned To</h3>
    
    {#if $usersQuery.isError}
      <div class="popover-error-message">{POPOVER_ERRORS.LOAD_USERS}</div>
    {:else if error}
      <div class="popover-error-message">{error}</div>
    {/if}

    {#if $usersQuery.isLoading}
      <div class="popover-loading-indicator">Loading users...</div>
    {:else}
      <PopoverOptionList
        options={availableUsers.filter(validateUserData)}
        loading={$usersQuery.isLoading}
        maxHeight={POPOVER_CONSTANTS.DEFAULT_MAX_HEIGHT}
        onOptionClick={(user, event) => {
          const isCurrentlySelected = localSelectedIds.has(user.id);
          handleUserToggle(user, !isCurrentlySelected);
        }}
        isSelected={(option) => localSelectedIds.has(option.id)}
      >
        <svelte:fragment slot="option-content" let:option>
          {@const userOption = option}
          <div class="technician-avatar popover-option-left-content">
            <UserAvatar user={userOption} size="xs" />
          </div>
          <span class="popover-option-main-label">{option.attributes.name}</span>
          
          <!-- Checkmark in same reactive scope for immediate updates -->
          <div class="popover-checkmark-container">
            {#if localSelectedIds.has(option.id)}
              <img src="/icons/checkmark.svg" alt="Selected" class="popover-checkmark-icon" />
            {/if}
          </div>
        </svelte:fragment>
      </PopoverOptionList>
    {/if}
  </svelte:fragment>
</HeadlessPopoverButton>

<style>
  /* Override HeadlessPopoverButton styles for dynamic button sizing */
  :global(.popover-button.has-assignments) {
    border-radius: 18px !important;
    width: auto !important;
    min-width: 36px !important;
    padding: 0 6px !important;
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

  /* Panel content styling */

  /* Component-specific option styling removed - now using shared classes */

</style>