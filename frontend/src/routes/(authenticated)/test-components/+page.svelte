<script lang="ts">
  import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
  import PriorityBadge from '$lib/components/ui/PriorityBadge.svelte';
  import EditableTitle from '$lib/components/ui/EditableTitle.svelte';
  import BasePopover from '$lib/components/ui/BasePopover.svelte';
  import PopoverMenu from '$lib/components/ui/PopoverMenu.svelte';
  import UserAvatar from '$lib/components/ui/UserAvatar.svelte';

  // Test data
  let editableValue = $state('Click to edit this title');
  let selectedStatus = $state('open');
  let selectedPriority = $state('high');
  let selectedTechnicians = $state<string[]>(['1', '3']);

  const jobStatuses = ['open', 'in_progress', 'paused', 'waiting_for_customer', 'successfully_completed', 'cancelled'];
  const taskStatuses = ['new_task', 'in_progress', 'paused', 'successfully_completed', 'cancelled'];
  const jobPriorities = ['low', 'normal', 'high', 'critical', 'proactive_followup'];
  const taskPriorities = ['low', 'medium', 'high'];

  const statusOptions = [
    { id: 'open', value: 'open', label: 'Open', icon: '⚫' },
    { id: 'in_progress', value: 'in_progress', label: 'In Progress', icon: '🟢' },
    { id: 'paused', value: 'paused', label: 'Paused', icon: '⏸️' },
    { id: 'waiting', value: 'waiting_for_customer', label: 'Waiting', icon: '⏳' },
    { id: 'completed', value: 'successfully_completed', label: 'Completed', icon: '✅' },
    { id: 'cancelled', value: 'cancelled', label: 'Cancelled', icon: '❌' }
  ];

  const technicianOptions = [
    { id: '1', value: '1', label: 'John Doe', icon: '👤' },
    { id: '2', value: '2', label: 'Jane Smith', icon: '👤' },
    { id: '3', value: '3', label: 'Bob Johnson', icon: '👤' },
    { id: '4', value: '4', label: 'Alice Williams', icon: '👤' }
  ];

  const menuWithHeaders = [
    { id: 'header1', value: '', label: 'Active Statuses', header: true },
    { id: 'open', value: 'open', label: 'Open', icon: '⚫' },
    { id: 'in_progress', value: 'in_progress', label: 'In Progress', icon: '🟢' },
    { id: 'divider1', value: '', label: '', divider: true },
    { id: 'header2', value: '', label: 'Inactive Statuses', header: true },
    { id: 'completed', value: 'successfully_completed', label: 'Completed', icon: '✅' },
    { id: 'cancelled', value: 'cancelled', label: 'Cancelled', icon: '❌', disabled: true }
  ];

  const testUsers = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', avatar_url: 'https://i.pravatar.cc/150?img=5' },
    { id: 3, name: 'Bob Johnson', color: '#9333ea' },
    { id: 4, email: 'alice@example.com' },
    { id: 5, name: 'Charlie Brown' },
    { id: 6, name: 'Diana Prince' }
  ];

  async function handleSave(value: string) {
    console.log('Saving:', value);
    editableValue = value;
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
  }
</script>

<div class="test-container">
  <h1>Component Test Page</h1>

  <!-- StatusBadge Tests -->
  <section>
    <h2>StatusBadge Component</h2>
    
    <h3>Job Statuses</h3>
    <div class="demo-row">
      {#each jobStatuses as status}
        <StatusBadge {status} type="job" />
      {/each}
    </div>

    <h3>Task Statuses</h3>
    <div class="demo-row">
      {#each taskStatuses as status}
        <StatusBadge {status} type="task" />
      {/each}
    </div>

    <h3>Size Variants</h3>
    <div class="demo-row">
      <StatusBadge status="in_progress" size="small" />
      <StatusBadge status="in_progress" size="medium" />
      <StatusBadge status="in_progress" size="large" />
    </div>

    <h3>Without Labels</h3>
    <div class="demo-row">
      <StatusBadge status="open" showLabel={false} />
      <StatusBadge status="in_progress" showLabel={false} />
      <StatusBadge status="successfully_completed" showLabel={false} />
    </div>
  </section>

  <!-- PriorityBadge Tests -->
  <section>
    <h2>PriorityBadge Component</h2>
    
    <h3>Job Priorities</h3>
    <div class="demo-row">
      {#each jobPriorities as priority}
        <PriorityBadge {priority} type="job" />
      {/each}
    </div>

    <h3>Task Priorities</h3>
    <div class="demo-row">
      {#each taskPriorities as priority}
        <PriorityBadge {priority} type="task" />
      {/each}
    </div>

    <h3>Show Normal Priority</h3>
    <div class="demo-row">
      <PriorityBadge priority="normal" hideNormal={false} />
      <PriorityBadge priority="normal" hideNormal={true} /> (hidden)
    </div>
  </section>

  <!-- EditableTitle Tests -->
  <section>
    <h2>EditableTitle Component</h2>
    
    <h3>Click to Edit</h3>
    <EditableTitle 
      value={editableValue}
      onSave={handleSave}
      placeholder="Enter title..."
    />

    <h3>Different Tags</h3>
    <div class="demo-column">
      <EditableTitle value="H1 Title" tag="h1" onSave={handleSave} />
      <EditableTitle value="H3 Title" tag="h3" onSave={handleSave} />
      <EditableTitle value="Span Title" tag="span" onSave={handleSave} />
    </div>

    <h3>Custom Styling</h3>
    <EditableTitle 
      value="Custom Styled Title"
      fontSize="24px"
      fontWeight="300"
      className="custom-title"
      onSave={handleSave}
    />
  </section>

  <!-- BasePopover with PopoverMenu Tests -->
  <section>
    <h2>BasePopover & PopoverMenu Components</h2>
    
    <h3>Status Selection (Single Select)</h3>
    <BasePopover preferredPlacement="bottom">
      {#snippet trigger({ popover })}
        <button use:popover.button class="demo-button">
          Status: {selectedStatus}
        </button>
      {/snippet}
      
      {#snippet children({ close })}
        <div style="padding: 8px;">
          <h3 style="margin: 0 0 8px 0; font-size: 14px;">Select Status</h3>
          <PopoverMenu
            options={statusOptions}
            selected={selectedStatus}
            onSelect={(value) => {
              selectedStatus = value;
            }}
            onClose={close}
          />
        </div>
      {/snippet}
    </BasePopover>

    <h3>Technician Assignment (Multi Select)</h3>
    <BasePopover preferredPlacement="right" panelWidth="280px">
      {#snippet trigger({ popover })}
        <button use:popover.button class="demo-button">
          Technicians ({selectedTechnicians.length})
        </button>
      {/snippet}
      
      {#snippet children({ close })}
        <div style="padding: 8px;">
          <h3 style="margin: 0 0 8px 0; font-size: 14px;">Assign Technicians</h3>
          <PopoverMenu
            options={technicianOptions}
            selected={selectedTechnicians}
            multiple={true}
            onSelect={(value) => {
              if (selectedTechnicians.includes(value)) {
                selectedTechnicians = selectedTechnicians.filter(v => v !== value);
              } else {
                selectedTechnicians = [...selectedTechnicians, value];
              }
            }}
          />
        </div>
      {/snippet}
    </BasePopover>

    <h3>Menu with Headers & Dividers</h3>
    <BasePopover preferredPlacement="bottom" showArrow={false}>
      {#snippet trigger({ popover })}
        <button use:popover.button class="demo-button">
          Complex Menu
        </button>
      {/snippet}
      
      {#snippet children({ close })}
        <PopoverMenu
          options={menuWithHeaders}
          selected="open"
          onSelect={(value) => console.log('Selected:', value)}
          onClose={close}
        />
      {/snippet}
    </BasePopover>
  </section>

  <!-- UserAvatar Tests -->
  <section>
    <h2>UserAvatar Component</h2>
    
    <h3>Basic Avatars</h3>
    <div class="demo-row">
      {#each testUsers as user}
        <UserAvatar {user} />
      {/each}
    </div>

    <h3>Size Variants</h3>
    <div class="demo-row align-center">
      <UserAvatar user={testUsers[0]} size="small" />
      <UserAvatar user={testUsers[0]} size="medium" />
      <UserAvatar user={testUsers[0]} size="large" />
      <UserAvatar user={testUsers[0]} size="xlarge" />
    </div>

    <h3>Shapes & Borders</h3>
    <div class="demo-row">
      <UserAvatar user={testUsers[1]} shape="circle" showBorder={true} />
      <UserAvatar user={testUsers[1]} shape="square" showBorder={true} />
      <UserAvatar user={testUsers[1]} shape="circle" showBorder={false} />
    </div>

    <h3>Clickable Avatars</h3>
    <div class="demo-row">
      {#each testUsers.slice(0, 3) as user}
        <UserAvatar 
          {user} 
          clickable={true}
          onClick={(u) => alert(`Clicked: ${u?.name || u?.email || 'Unknown'}`)}
        />
      {/each}
    </div>

    <h3>Avatar Group (Overlapping)</h3>
    <div class="avatar-group">
      {#each testUsers as user, i}
        <UserAvatar 
          {user}
          size="small" 
          overlap={true}
          overlapOrder={testUsers.length - i}
          showBorder={true}
        />
      {/each}
    </div>
  </section>
</div>

<style>
  .test-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 40px 20px;
  }

  section {
    margin-bottom: 60px;
    padding: 30px;
    background: var(--bg-secondary);
    border-radius: 12px;
    border: 1px solid var(--border-primary);
  }

  h1 {
    font-size: 32px;
    margin-bottom: 40px;
    color: var(--text-primary);
  }

  h2 {
    font-size: 24px;
    margin-bottom: 24px;
    color: var(--text-primary);
    border-bottom: 2px solid var(--border-primary);
    padding-bottom: 12px;
  }

  h3 {
    font-size: 16px;
    margin-bottom: 16px;
    color: var(--text-secondary);
    font-weight: 600;
  }

  .demo-row {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: 24px;
  }

  .demo-row.align-center {
    align-items: center;
  }

  .demo-column {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 24px;
  }

  .demo-button {
    padding: 8px 16px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    color: var(--text-primary);
    transition: all 0.15s ease;
  }

  .demo-button:hover {
    background: var(--bg-quaternary);
    border-color: var(--accent-blue);
  }

  .avatar-group {
    display: flex;
    align-items: center;
    padding-left: 8px;
  }

  :global(.custom-title) {
    color: var(--accent-purple);
  }
</style>