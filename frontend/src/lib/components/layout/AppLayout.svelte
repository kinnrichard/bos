<script lang="ts">
  import { layout, layoutActions } from '$lib/stores/layout.svelte';
  import Sidebar from './Sidebar.svelte';
  import Toolbar from './Toolbar.svelte';

  // Props for layout customization
  export let showSidebar = true;
  export let showToolbar = true;
</script>

<div class="app-container">
  <!-- Sidebar -->
  {#if showSidebar && layout.sidebarVisible}
    <div class="sidebar-container" class:mobile={layout.isMobile}>
      <Sidebar />
    </div>
  {/if}

  <!-- Mobile backdrop -->
  {#if layout.isMobile && layout.sidebarVisible && showSidebar}
    <div 
      class="mobile-backdrop"
      on:click={layoutActions.hideSidebar}
      on:keydown={(e) => e.key === 'Escape' && layoutActions.hideSidebar()}
      role="button"
      tabindex="-1"
    ></div>
  {/if}

  <!-- Main content area -->
  <div class="main-area">
    <!-- Toolbar -->
    {#if showToolbar}
      <div class="toolbar-container">
        <Toolbar />
      </div>
    {/if}

    <!-- Page content -->
    <main class="content">
      <slot />
    </main>
  </div>
</div>

<style>
  .app-container {
    display: flex;
    height: 100vh;
    background-color: var(--bg-black);
    color: var(--text-primary);
    overflow: hidden;
  }

  .sidebar-container {
    width: 280px;
    flex-shrink: 0;
    background-color: var(--bg-primary);
    position: relative;
    z-index: 100;
    margin: 12px 0 12px 12px;
    border-radius: 16px;
    border: 1px solid var(--border-primary);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  }

  .sidebar-container.mobile {
    position: fixed;
    top: 16px;
    left: 16px;
    height: calc(100vh - 32px);
    z-index: 1000;
    margin: 0;
    background-color: rgba(28, 28, 30, 0.95);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    box-shadow: 4px 0 20px rgba(0, 0, 0, 0.3);
    border-radius: 16px;
  }

  .mobile-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 999;
    cursor: pointer;
  }

  .main-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0; /* Prevent flex items from overflowing */
  }

  .toolbar-container {
    height: 64px;
    flex-shrink: 0;
    background-color: var(--bg-black);
  }

  .content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    background-color: var(--bg-black);
    position: relative;
  }


  /* Responsive adjustments */
  @media (max-width: 768px) {
    .sidebar-container:not(.mobile) {
      width: 0;
      transform: translateX(-100%);
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .sidebar-container {
      border-right-width: 2px;
    }
    
    .toolbar-container {
      border-bottom-width: 2px;
    }
  }

</style>