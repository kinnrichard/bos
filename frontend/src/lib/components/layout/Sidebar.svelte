<script lang="ts">
  import { page } from '$app/stores';
  import { currentClient, getClientTypeEmoji, isMobile, layoutActions } from '$lib/stores/layout';
  import { mainNavItems, footerNavItems, brandConfig, getActiveNavItem } from '$lib/config/navigation';

  // Reactive active item tracking
  $: activeItem = getActiveNavItem($page.url.pathname);

</script>

<div 
  class="sidebar"
  role="navigation"
  aria-label="Main navigation"
>

  <!-- Brand/Logo -->
  <div class="brand-section">
    <!-- Logo -->
    <div class="logo-container">
      <img src="/faultless_logo.png" alt="Faultless" class="logo" />
    </div>
  </div>

  <!-- Close button (CSS-controlled visibility) -->
  <button 
    class="close-btn"
    on:click={layoutActions.hideSidebar}
    aria-label="Close sidebar"
  >
    <!-- Close icon -->
    <img src="/icons/close.svg" alt="Close" />
  </button>

  <!-- Main Navigation -->
  <nav class="main-nav">
    <ul class="nav-list">
  	  <!-- Current Client Section -->
  	  {#if $currentClient}
  	    <li class="nav-item">
  	      <a 
  	        href="#"
  	        class="nav-link"
  	      >
  	        <span class="nav-icon">
  	          {getClientTypeEmoji($currentClient.client_type)}
  	        </span>
  	        <span class="nav-label">{$currentClient.name}</span>
  	      </a>
  	    </li>
        <!-- Invisible spacer -->
        <li class="nav-spacer" aria-hidden="true"></li>
  	  {/if}
  
  

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
    background-color: var(--bg-secondary);
    position: relative;
    overflow-y: auto;
    overflow-x: hidden;
    border-radius: 16px;
  }

  /* Close button */
  .close-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 22px;
    height: 22px;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.25s ease;
  }

  .close-btn img {
    opacity: 0.5;
    transition: opacity 0.25s ease;
  }
  
  /* Show close button when hovering brand section or the button itself */
  .brand-section:hover + .close-btn,
  .close-btn:hover {
    opacity: 1;
    pointer-events: auto;
  }
  
  .close-btn:hover img {
    opacity: 1;
  }
  

  /* Brand section */
  .brand-section {
    padding: 12px;
    margin-bottom: 30px;
  }


  /* Sidebar logo styling */
  .brand-section .logo-container {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .brand-section .logo {
    height: 40px;
    width: auto;
  }




  /* Main navigation */
  .main-nav {
    flex: 1;
    padding: 0 12px 16px;
  }

  .nav-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }

  .nav-item {
    width: 100%;
  }

  .nav-spacer {
    height: 15px; /* matches nav-link height: 6px top + 6px bottom + 13px font + 12px for line-height */
    width: 100%;
  }

  .nav-link {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 16px;
    text-decoration: none;
    color: var(--text-secondary);
    border-radius: 8px;
    transition: all 0.15s ease;
    font-size: 13px;
    font-weight: 500;
    margin: 0;
  }

  .nav-link:hover {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .nav-link.active {
    background-color: var(--accent-blue);
    color: #FFFFFF;
    font-weight: bold;
    text-shadow: 1.5px 1.5px 3px rgba(0, 0, 0, 0.5);
  }

  .nav-icon {
    font-size: 16px;
    width: 20px;
    text-align: center;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transform: translateY(-1px);
  }

  .nav-label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Footer navigation */
  .footer-nav {
    padding: 0 12px 12px;
    margin-top: auto;
  }

  .footer-link {
    color: var(--text-secondary);
    font-size: 13px;
  }

  .footer-link:hover {
    color: var(--text-primary);
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
    .nav-link.active {
      border: 2px solid var(--accent-blue-hover);
    }
  }

  /* Accessibility improvements */
  @media (prefers-reduced-motion: reduce) {
    .nav-link {
      transition: none;
    }
  }
</style>