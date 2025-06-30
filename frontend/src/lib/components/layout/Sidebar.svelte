<script lang="ts">
  import { page } from '$app/stores';
  import { currentClient, getClientTypeEmoji, isMobile, layoutActions } from '$lib/stores/layout';
  import { mainNavItems, footerNavItems, brandConfig, getActiveNavItem } from '$lib/config/navigation';

  // Reactive active item tracking
  $: activeItem = getActiveNavItem($page.url.pathname);

  // Mobile close button (only show on hover on mobile)
  let sidebarHovered = false;
</script>

<div 
  class="sidebar"
  on:mouseenter={() => sidebarHovered = true}
  on:mouseleave={() => sidebarHovered = false}
  role="navigation"
  aria-label="Main navigation"
>
  <!-- Close button for mobile (hover only) -->
  {#if $isMobile && sidebarHovered}
    <button 
      class="mobile-close-btn"
      on:click={layoutActions.hideSidebar}
      aria-label="Close sidebar"
    >
      <!-- Using temp close icon as specified -->
      <img src="/temp/close.svg" alt="Close" />
    </button>
  {/if}

  <!-- Brand/Logo -->
  <div class="brand-section">
    <!-- Logo -->
    <div class="logo-container">
      <img src="/faultless_logo.png" alt="Faultless" class="logo" />
    </div>
  </div>

  <!-- Current Client Section -->
  {#if $currentClient}
    <div class="client-section">
      <a href="/clients/{$currentClient.id}" class="client-link">
        <div class="client-icon">
          {getClientTypeEmoji($currentClient.client_type)}
        </div>
        <div class="client-info">
          <div class="client-name">{$currentClient.name}</div>
        </div>
      </a>
    </div>
  {/if}

  <!-- Main Navigation -->
  <nav class="main-nav">
    <ul class="nav-list">
      {#each mainNavItems as item (item.id)}
        <li class="nav-item">
          <a 
            href={item.href}
            class="nav-link"
            class:active={activeItem === item.id}
            data-nav-item={item.id}
          >
            <span class="nav-icon">{item.icon}</span>
            <span class="nav-label">{item.label}</span>
          </a>
        </li>
      {/each}
    </ul>
  </nav>

  <!-- Footer Navigation -->
  <div class="footer-nav">
    <ul class="nav-list">
      {#each footerNavItems as item (item.id)}
        <li class="nav-item">
          <a 
            href={item.href}
            class="nav-link footer-link"
            class:active={activeItem === item.id}
          >
            <span class="nav-icon">{item.icon}</span>
            <span class="nav-label">{item.label}</span>
          </a>
        </li>
      {/each}
    </ul>
  </div>
</div>

<style>
  .sidebar {
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--bg-primary);
    position: relative;
    overflow-y: auto;
    overflow-x: hidden;
    border-radius: 12px;
  }

  /* Mobile close button */
  .mobile-close-btn {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 24px;
    height: 24px;
    background: none;
    border: none;
    cursor: pointer;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background-color 0.15s ease;
  }

  .mobile-close-btn:hover {
    background-color: var(--bg-tertiary);
  }

  .mobile-close-btn img {
    width: 16px;
    height: 16px;
    opacity: 0.7;
  }

  /* Brand section */
  .brand-section {
    padding: 28px 24px 24px;
  }

  .brand-link {
    display: flex;
    align-items: center;
    gap: 12px;
    text-decoration: none;
    color: var(--text-primary);
    transition: opacity 0.15s ease;
  }

  .brand-link:hover {
    opacity: 0.8;
  }

  /* Sidebar logo styling */
  .brand-section .logo-container {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .brand-section .logo {
    height: 32px;
    width: auto;
  }

  .brand-icon {
    font-size: 24px;
    color: var(--accent-blue);
  }

  .brand-name {
    font-size: 18px;
    font-weight: 600;
    letter-spacing: 0.5px;
  }

  /* Client section */
  .client-section {
    padding: 20px 24px;
  }

  .client-link {
    display: flex;
    align-items: center;
    gap: 12px;
    text-decoration: none;
    color: inherit;
    padding: 12px;
    border-radius: 8px;
    transition: background-color 0.15s ease;
  }

  .client-link:hover {
    background-color: var(--bg-tertiary);
  }

  .client-icon {
    font-size: 20px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--bg-secondary);
    border-radius: 6px;
    flex-shrink: 0;
  }

  .client-info {
    flex: 1;
    min-width: 0;
  }

  .client-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }


  /* Main navigation */
  .main-nav {
    flex: 1;
    padding: 20px 20px;
  }

  .nav-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .nav-item {
    width: 100%;
  }

  .nav-link {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    text-decoration: none;
    color: var(--text-secondary);
    border-radius: 8px;
    transition: all 0.15s ease;
    font-size: 14px;
    font-weight: 500;
  }

  .nav-link:hover {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .nav-link.active {
    background-color: var(--accent-blue);
    color: #FFFFFF;
  }

  .nav-icon {
    font-size: 16px;
    width: 20px;
    text-align: center;
    flex-shrink: 0;
  }

  .nav-label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Footer navigation */
  .footer-nav {
    padding: 16px 20px;
    margin-top: auto;
  }

  .footer-link {
    color: var(--text-tertiary);
    font-size: 13px;
  }

  .footer-link:hover {
    color: var(--text-secondary);
  }

  .footer-link.active {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .sidebar {
      width: 280px;
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .brand-section,
    .client-section,
    .footer-nav {
      border-width: 2px;
    }

    .nav-link.active {
      border: 2px solid var(--accent-blue-hover);
    }
  }

  /* Accessibility improvements */
  @media (prefers-reduced-motion: reduce) {
    .nav-link,
    .client-link,
    .brand-link {
      transition: none;
    }
  }
</style>