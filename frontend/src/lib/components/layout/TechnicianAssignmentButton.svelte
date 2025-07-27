<script lang="ts">
  import BasePopover from '$lib/components/ui/BasePopover.svelte';
  import PopoverMenu from '$lib/components/ui/PopoverMenu.svelte';
  import UserAvatar from '$lib/components/ui/UserAvatar.svelte';
  // NOTE: getZeroContext import removed as it was unused

  // Epic-009: Use ReactiveRecord models for consistent architecture
  import { ReactiveJob } from '$lib/models/reactive-job';
  import { ReactiveUser } from '$lib/models/reactive-user';
  import type { UserData } from '$lib/models/types/user-data';
  // NOTE: JobData type import removed as it was unused
  import { JobAssignment } from '$lib/models/job-assignment';
  import { debugWorkflow } from '$lib/utils/debug';
  import { POPOVER_CONSTANTS } from '$lib/utils/popover-constants';
  import { getPopoverErrorMessage } from '$lib/utils/popover-utils';
  // NOTE: createIdSet import removed as it was unused
  // NOTE: tick import removed as it was unused
  import '$lib/styles/popover-common.css';

  // NOTE: asUser helper function removed as it was unused

  let {
    jobId,
    // Optional props to provide initial data while job query loads
    initialTechnicians = [] as Array<{ id: string }>,
    disabled = false,
  }: {
    jobId: string;
    initialTechnicians?: Array<{ id: string }>;
    disabled?: boolean;
  } = $props();

  let basePopover = $state();

  // Epic-009: Use ReactiveUser model for consistent architecture
  const usersQuery = ReactiveUser.all().orderBy('name', 'asc').all();

  // Epic-009: Enhanced job query to include user relationships for better data loading
  const jobQuery = $derived(jobId ? ReactiveJob.includes('jobAssignments.user').find(jobId) : null);

  // NOTE: Local isLoading state removed as it was assigned but never used in template
  let error = $state<Error | null>(null);

  // Derived state from ReactiveJob query - fallback to initial data
  const job = $derived(jobQuery?.data); // ReactiveJob query returns data directly
  const availableUsers = $derived(usersQuery.data || []);

  // Use populated technicians from job.jobAssignments relationship
  // Note: TypeScript doesn't know about includes() relationship data, but runtime has it
  const assignedTechnicians = $derived(
    (job as any)?.jobAssignments?.map((a: any) => a.user) || initialTechnicians
  );
  const assignedTechniciansForDisplay = $derived(assignedTechnicians);

  const errorMessage = $derived(getPopoverErrorMessage(error));

  // Create options array for PopoverMenu with custom properties
  const menuOptions = $derived(
    availableUsers.map((user) => ({
      id: user.id,
      value: user.id,
      label: user.name,
      user: user, // Include full user object for avatar rendering
      selected: (job as any)?.jobAssignments?.some((a: any) => a.user_id === user.id) || false,
    }))
  );

  // Get currently selected user IDs
  const selectedUserIds = $derived((job as any)?.jobAssignments?.map((a: any) => a.user_id) || []);

  // Reactive state derived directly from job assignments - no local state needed

  // Handle checkbox changes - reactive mutations with automatic UI updates
  async function handleUserToggle(userId: string, option: any) {
    // Remove loading guard to allow optimistic updates

    const user = option.user as UserData;
    const isCurrentlySelected = selectedUserIds.includes(userId);

    // Epic-008: Zero.js provides reliable data, validation unnecessary
    if (!userId) {
      debugWorkflow('Missing user ID, ignoring click', user);
      return;
    }

    // Ensure jobId is valid
    if (!jobId) {
      debugWorkflow('Invalid jobId, ignoring click', { jobId });
      return;
    }

    debugWorkflow('User clicked technician assignment', {
      userName: user.name,
      action: !isCurrentlySelected ? 'ON' : 'OFF',
    });

    // Reactive mutations - UI updates automatically when data changes
    try {
      // NOTE: isLoading assignment removed as variable was unused
      error = null;

      if (!isCurrentlySelected) {
        // Create new job assignment
        await JobAssignment.create({
          job_id: jobId,
          user_id: userId,
        });
        debugWorkflow('Created assignment', { userName: user.name, jobId });
      } else {
        // Find and delete existing job assignment
        const existingAssignment = (job as any)?.jobAssignments?.find(
          (a: any) => a.user_id === userId
        );
        if (existingAssignment?.id) {
          await JobAssignment.destroy(existingAssignment.id);
          debugWorkflow('Deleted assignment', { userName: user.name, jobId });
        }
      }
    } catch (err) {
      error = err as Error;
      debugWorkflow('Error during assignment mutation', err);
      debugWorkflow.error('Technician assignment mutation error', { error: err, jobId, userId });
    } finally {
      // NOTE: isLoading assignment removed as variable was unused
    }
  }

  // Display logic for button content - use actual assignment data
  const displayTechnicians = $derived(assignedTechniciansForDisplay.slice(0, 2));
  const extraCount = $derived(Math.max(0, assignedTechniciansForDisplay.length - 2));
  const hasAssignments = $derived(assignedTechniciansForDisplay.length > 0);
</script>

<BasePopover
  bind:popover={basePopover}
  preferredPlacement="bottom"
  panelWidth="max-content"
  panelMinWidth="240px"
  {disabled}
>
  {#snippet trigger({ popover })}
    <button
      class="popover-button"
      class:has-assignments={hasAssignments}
      class:disabled
      use:popover.button
      title={disabled
        ? 'Disabled'
        : hasAssignments
          ? `Technicians: ${assignedTechniciansForDisplay
              .map((t) => t?.name)
              .filter(Boolean)
              .join(', ')}`
          : 'Technicians'}
      {disabled}
      onclick={disabled ? undefined : (e) => e.stopPropagation()}
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
        <img
          src={POPOVER_CONSTANTS.ADD_PERSON_ICON}
          alt="Assign technicians"
          class="add-person-icon"
        />
      {/if}
    </button>
  {/snippet}

  {#snippet children({ close })}
    {#if errorMessage}
      <div style="padding: {POPOVER_CONSTANTS.COMPACT_CONTENT_PADDING};">
        <div class="popover-error-message">{errorMessage}</div>
      </div>
    {:else if usersQuery.isLoading}
      <div style="padding: {POPOVER_CONSTANTS.COMPACT_CONTENT_PADDING};">
        <div class="popover-loading-indicator">Loading users...</div>
      </div>
    {:else}
      <PopoverMenu
        options={[
          { id: 'title', value: 'title', label: 'Assigned To', header: true },
          ...menuOptions,
        ]}
        selected={selectedUserIds}
        multiple={true}
        onSelect={handleUserToggle}
        onClose={close}
        showCheckmarks={true}
        showIcons={true}
        iconPosition="left"
        enableKeyboard={true}
        autoFocus={true}
        className="technician-assignment-menu"
      >
        {#snippet iconContent({ option })}
          {#if option.user}
            <UserAvatar user={option.user} size="xs" />
          {/if}
        {/snippet}
      </PopoverMenu>
    {/if}
  {/snippet}
</BasePopover>

<style>
  .popover-button {
    width: 36px;
    height: 36px;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
    padding: 0;
    pointer-events: auto !important;
    position: relative;
    z-index: 10;
  }

  .popover-button:hover:not(:disabled) {
    background-color: var(--bg-tertiary);
    border-color: var(--accent-blue);
  }

  .popover-button:disabled,
  .popover-button.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  /* Override button styles for dynamic button sizing when has assignments */
  .popover-button.has-assignments {
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

  /* Accessibility improvements */
  @media (prefers-reduced-motion: reduce) {
    .popover-button {
      transition: none;
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .popover-button {
      border-width: 2px;
    }
  }

  /* Panel content styling */

  /* NOTE: Unused CSS selectors removed:
   * - .technician-avatar
   * - .technician-assignment-menu :global(.popover-menu-icon .user-avatar)
   * - .technician-assignment-menu :global(.popover-menu-label)
   */
</style>
