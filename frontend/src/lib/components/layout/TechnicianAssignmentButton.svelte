<script lang="ts">
  import HeadlessPopoverButton from '$lib/components/ui/HeadlessPopoverButton.svelte';
  import PopoverOptionList from '$lib/components/ui/PopoverOptionList.svelte';
  import UserAvatar from '$lib/components/ui/UserAvatar.svelte';
  import { getZeroContext } from '$lib/zero-context.svelte';

  // Get Zero functions from context
  const { User, Job } = getZeroContext();
  // Use Zero's User type instead of the old JSON:API format
  import type { User as ZeroUser } from '$lib/zero/user.generated';
  import { debugTechAssignment } from '$lib/utils/debug';
  import { POPOVER_CONSTANTS, POPOVER_ERRORS } from '$lib/utils/popover-constants';
  import { getPopoverErrorMessage, validateUserData, createIdSet } from '$lib/utils/popover-utils';
  import { tick } from 'svelte';
  import '$lib/styles/popover-common.css';

  // Helper function to safely cast popover options to ZeroUser
  function asUser(option: any): ZeroUser {
    return option as ZeroUser;
  }

  let {
    jobId,
    // Optional props to provide initial data while job query loads
    initialTechnicians = [] as Array<{id: string}>
  }: {
    jobId: string;
    initialTechnicians?: Array<{id: string}>;
  } = $props();

  let popover: any;
  
  // Use Zero Query for all data - single source of truth
  const usersQuery = User.all();
  // TODO: Need to implement user lookup functionality
  // const userLookup = useUserLookup();
  const jobQuery = Job.find(jobId);
  
  // Zero uses direct mutations instead of TanStack's createMutation pattern
  let isLoading = false;
  let error: Error | null = null;

  // Derived state from Zero Query - fallback to initial data
  const job = $derived(jobQuery.value); // Zero returns value directly
  const availableUsers = $derived(usersQuery.value || []);
  // Use populated technicians from job.assignments instead of relationships
  const assignedTechnicians = $derived(job?.assignments?.map(a => a.user) || initialTechnicians);
  const assignedTechniciansForDisplay = $derived(assignedTechnicians);
  
  const errorMessage = $derived(getPopoverErrorMessage(error));
  
  // Local state for immediate UI responsiveness (optimistic updates)
  let localSelectedIds: Set<string> = new Set();
  let optimisticTechnicians: ZeroUser[] = [];
  
  // Sync with server data only when server data actually changes (not on every local update)
  // This prevents unnecessary re-renders that cause hover flicker
  let lastServerDataHash = '';
  $effect(() => {
    const currentServerIds = assignedTechnicians?.map(t => t?.id).filter(Boolean) || [];
    const currentHash = currentServerIds.sort().join(',');
    
    // Only update localSelectedIds if server data actually changed
    if (currentHash !== lastServerDataHash) {
      lastServerDataHash = currentHash;
      localSelectedIds = new Set(currentServerIds);
    }
  });
  
  // Derive optimistic display data separately - this only updates when users list or localSelectedIds change
  $effect(() => {
    const userList = usersQuery.value || [];
    optimisticTechnicians = Array.from(localSelectedIds)
      .map(id => userList.find(user => user.id === id))
      .filter(Boolean) as ZeroUser[];
  });

  // Handle checkbox changes - optimistic updates, no loading blocking
  async function handleUserToggle(user: ZeroUser, checked: boolean) {
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
      user.name, checked ? 'ON' : 'OFF', technicianIds);
    
    // Zero direct mutation handles API call and real-time updates
    try {
      isLoading = true;
      error = null;
      // TODO: Implement assignTechniciansToJob functionality
      // This would need to work with your job_assignments table
      console.log('TODO: assignTechniciansToJob', { jobId, technicianIds });
    } catch (err) {
      error = err as Error;
      debugTechAssignment('Error during mutation: %o', err);
      console.error('TechnicianAssignmentButton mutation error:', err);
    } finally {
      isLoading = false;
    }
  }

  // Display logic for button content - use optimistic data
  const displayTechnicians = $derived(optimisticTechnicians.slice(0, 2));
  const extraCount = $derived(Math.max(0, optimisticTechnicians.length - 2));
  const hasAssignments = $derived(optimisticTechnicians.length > 0);
</script>

<HeadlessPopoverButton 
  bind:popover
  title={hasAssignments ? `Technicians: ${optimisticTechnicians.map(t => t?.name).filter(Boolean).join(', ')}` : 'Technicians'}
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
    
    {#if error}
      <div class="popover-error-message">{error}</div>
    {/if}

    {#if !usersQuery.value}
      <div class="popover-loading-indicator">Loading users...</div>
    {:else}
      <PopoverOptionList
        options={availableUsers.filter(validateUserData)}
        loading={!usersQuery.value}
        maxHeight={POPOVER_CONSTANTS.DEFAULT_MAX_HEIGHT}
        onOptionClick={(user, event) => {
          const isCurrentlySelected = localSelectedIds.has(user.id);
          handleUserToggle(user, !isCurrentlySelected);
        }}
        isSelected={(option) => localSelectedIds.has(option.id)}
      >
        <svelte:fragment slot="option-content" let:option>
          <div class="technician-avatar popover-option-left-content">
            <UserAvatar user={asUser(option)} size="xs" />
          </div>
          <span class="popover-option-main-label">{option.name}</span>
          
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