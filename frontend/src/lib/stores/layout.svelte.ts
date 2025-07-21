import { page } from '$app/stores';
import { browser } from '$app/environment';

// Client type definition
export type ClientType = 'business' | 'individual';

export interface Client {
  id: string;
  name: string;
  client_type: ClientType;
  attributes: {
    name: string;
    created_at: string;
    updated_at: string;
  };
}

// Layout state object - proper Svelte 5 pattern
export const layout = $state({
  sidebarVisible: true,
  currentClient: null as Client | null,
  isMobile: false
});

// Initialize mobile detection if in browser
if (browser) {
  const mediaQuery = window.matchMedia('(max-width: 768px)');
  layout.isMobile = mediaQuery.matches;
  
  mediaQuery.addEventListener('change', (e) => {
    layout.isMobile = e.matches;
    // Auto-hide sidebar on mobile by default
    if (e.matches) {
      layout.sidebarVisible = false;
    } else {
      layout.sidebarVisible = true;
    }
  });
}


// Client type helper functions
export function getClientTypeEmoji(clientType: ClientType): string {
  switch (clientType) {
    case 'business':
      return '🏢';
    case 'residential':
      return '🏠';
    default:
      return '👤';
  }
}

export function getClientTypeLabel(clientType: ClientType): string {
  return clientType === 'business' ? 'Business' : 'Individual';
}

// Layout actions
export const layoutActions = {
  toggleSidebar: () => {
    layout.sidebarVisible = !layout.sidebarVisible;
  },
  
  showSidebar: () => {
    layout.sidebarVisible = true;
  },
  
  hideSidebar: () => {
    layout.sidebarVisible = false;
  },
  
  setCurrentClient: (client: Client | null) => {
    layout.currentClient = client;
  }
};

// Current client will be set based on page context