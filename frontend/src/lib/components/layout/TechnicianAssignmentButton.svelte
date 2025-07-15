<script lang="ts">
  import HeadlessPopoverButton from '$lib/components/ui/HeadlessPopoverButton.svelte';
  import PopoverOptionList from '$lib/components/ui/PopoverOptionList.svelte';
  import UserAvatar from '$lib/components/ui/UserAvatar.svelte';
  import { getZeroContext } from '$lib/zero-context.svelte';
  
  // Epic-009: Use ReactiveRecord models for consistent architecture
  import { ReactiveJob } from '$lib/models/reactive-job';
  import { ReactiveUser } from '$lib/models/reactive-user';
  import type { UserData } from '$lib/models/types/user-data';
  import type { JobData } from '$lib/models/types/job-data';
  import { JobAssignment } from '$lib/models/job-assignment';
  import { debugTechAssignment } from '$lib/utils/debug';
  import { POPOVER_CONSTANTS, POPOVER_ERRORS } from '$lib/utils/popover-constants';
  import { getPopoverErrorMessage, createIdSet } from '$lib/utils/popover-utils';
  import { tick } from 'svelte';
  import '$lib/styles/popover-common.css';

  // Helper function to safely cast popover options to UserData
  function asUser(option: any): UserData {
    return option as UserData;
  }

  let {
    jobId,
    // Optional props to provide initial data while job query loads
    initialTechnicians = [] as Array<{id: string}>
  }: {
    jobId: string;
    initialTechnicians?: Array<{id: string}>;
  } = $props();

  let popover = $state();
  
  // Epic-009: Use ReactiveUser model for consistent architecture
  const usersQuery = ReactiveUser.all().orderBy('name', 'asc').all();
  
  // Epic-009: Enhanced job query to include user relationships for better data loading
  const jobQuery = $derived(jobId ? ReactiveJob.includes('jobAssignments.user').find(jobId) : null);
  
  // Zero uses direct mutations instead of TanStack's createMutation pattern
  let isLoading = $state(false);
  let error = $state<Error | null>(null);

  // Derived state from ReactiveJob query - fallback to initial data
  const job = $derived(jobQuery?.data); // ReactiveJob query returns data directly
  const availableUsers = $derived(usersQuery.data || []);
  
  
  // Use populated technicians from job.jobAssignments relationship
  // Note: TypeScript doesn't know about includes() relationship data, but runtime has it
  const assignedTechnicians = $derived((job as any)?.jobAssignments?.map((a: any) => a.user) || initialTechnicians);
  const assignedTechniciansForDisplay = $derived(assignedTechnicians);
  
  const errorMessage = $derived(getPopoverErrorMessage(error));
  
  // Reactive state derived directly from job assignments - no local state needed

  // Handle checkbox changes - reactive mutations with automatic UI updates
  async function handleUserToggle(user: UserData, checked: boolean) {
    // Remove loading guard to allow optimistic updates
    
    // Epic-008: Zero.js provides reliable data, validation unnecessary
    if (!user?.id) {
      debugTechAssignment('Missing user ID, ignoring click: %o', user);
      return;
    }
    
    // Ensure jobId is valid
    if (!jobId) {
      debugTechAssignment('Invalid jobId, ignoring click: %o', jobId);
      return;
    }
    
    debugTechAssignment('User clicked %s %s', user.name, checked ? 'ON' : 'OFF');
    
    // Reactive mutations - UI updates automatically when data changes
    try {
      isLoading = true;
      error = null;
      
      if (checked) {
        // Create new job assignment
        await JobAssignment.create({
          job_id: jobId,
          user_id: user.id
        });
        debugTechAssignment('Created assignment for %s on job %s', user.name, jobId);
      } else {
        // Find and delete existing job assignment
        const existingAssignment = (job as any)?.jobAssignments?.find((a: any) => a.user_id === user.id);
        if (existingAssignment?.id) {
          await JobAssignment.destroy(existingAssignment.id);
          debugTechAssignment('Deleted assignment for %s on job %s', user.name, jobId);
        }
      }
    } catch (err) {
      error = err as Error;
      debugTechAssignment('Error during mutation: %o', err);
      console.error('TechnicianAssignmentButton mutation error:', err);
    } finally {
      isLoading = false;
    }
  }

  // Display logic for button content - use actual assignment data
  const displayTechnicians = $derived(assignedTechniciansForDisplay.slice(0, 2));
  const extraCount = $derived(Math.max(0, assignedTechniciansForDisplay.length - 2));
  const hasAssignments = $derived(assignedTechniciansForDisplay.length > 0);
</script>

<HeadlessPopoverButton 
  bind:popover
  title={hasAssignments ? `Technicians: ${assignedTechniciansForDisplay.map(t => t?.name).filter(Boolean).join(', ')}` : 'Technicians'}
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

    {#if usersQuery.isLoading}
      <div class="popover-loading-indicator">Loading users...</div>
    {:else}
      <PopoverOptionList
        options={availableUsers}
        loading={usersQuery.isLoading}
        maxHeight={POPOVER_CONSTANTS.DEFAULT_MAX_HEIGHT}
        onOptionClick={(user, event) => {
          const isCurrentlySelected = (job as any)?.jobAssignments?.some((a: any) => a.user_id === user.id) || false;
          handleUserToggle(user, !isCurrentlySelected);
        }}
        isSelected={(option) => (job as any)?.jobAssignments?.some((a: any) => a.user_id === option.id) || false}
      >
        <svelte:fragment slot="option-content" let:option>
          <div class="technician-avatar popover-option-left-content">
            <UserAvatar user={asUser(option)} size="xs" />
          </div>
          <span class="popover-option-main-label">{option.name}</span>
          
          <!-- Checkmark bound to actual assignment data -->
          <div class="popover-checkmark-container">
            {#if (job as any)?.jobAssignments?.some((a: any) => a.user_id === option.id)}
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