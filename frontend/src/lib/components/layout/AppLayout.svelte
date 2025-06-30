<script lang="ts">
  import { sidebarVisible, isMobile } from '$lib/stores/layout';
  import Sidebar from './Sidebar.svelte';
  import Toolbar from './Toolbar.svelte';

  // Props for layout customization
  export let showSidebar = true;
  export let showToolbar = true;
</script>

<div class="app-container" class:sidebar-hidden={!$sidebarVisible || !showSidebar}>
  <!-- Sidebar -->
  {#if showSidebar && $sidebarVisible}
    <div class="sidebar-container" class:mobile={$isMobile}>
      <Sidebar />
    </div>
  {/if}

  <!-- Mobile backdrop -->
  {#if $isMobile && $sidebarVisible && showSidebar}
    <div 
      class="mobile-backdrop"
      on:click={() => sidebarVisible.set(false)}
      on:keydown={(e) => e.key === 'Escape' && sidebarVisible.set(false)}
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
    margin: 16px;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
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
    border-radius: 12px;
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
    height: 60px;
    flex-shrink: 0;
    background-color: var(--bg-black);
    border-bottom: 1px solid var(--border-primary);
  }

  .content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    background-color: var(--bg-black);
    position: relative;
  }

  /* Smooth transitions for sidebar */
  .sidebar-container {
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Hide sidebar on desktop when sidebar-hidden class is present */
  .app-container.sidebar-hidden .sidebar-container:not(.mobile) {
    transform: translateX(-100%);
    width: 0;
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

  /* Accessibility improvements */
  @media (prefers-reduced-motion: reduce) {
    .sidebar-container {
      transition: none;
    }
  }
</style>