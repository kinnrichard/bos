import { writable, derived } from 'svelte/store';
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

// Layout state stores
export const sidebarVisible = writable(true);
export const currentClient = writable<Client | null>(null);

// Mobile breakpoint detection
export const isMobile = writable(false);

// Initialize mobile detection if in browser
if (browser) {
  const mediaQuery = window.matchMedia('(max-width: 768px)');
  isMobile.set(mediaQuery.matches);
  
  mediaQuery.addEventListener('change', (e) => {
    isMobile.set(e.matches);
    // Auto-hide sidebar on mobile by default
    if (e.matches) {
      sidebarVisible.set(false);
    } else {
      sidebarVisible.set(true);
    }
  });
}

// Derived stores
export const currentPage = derived(page, ($page) => {
  if (!$page?.route?.id) return 'home';
  
  // Extract page type from route
  if ($page.route.id.includes('/jobs')) return 'jobs';
  if ($page.route.id.includes('/clients')) return 'clients';
  if ($page.route.id.includes('/people')) return 'people';
  if ($page.route.id.includes('/devices')) return 'devices';
  return 'home';
});

// Client type helper functions
export function getClientTypeEmoji(clientType: ClientType): string {
  return clientType === 'business' ? '🏢' : '👤';
}

export function getClientTypeLabel(clientType: ClientType): string {
  return clientType === 'business' ? 'Business' : 'Individual';
}

// Layout actions
export const layoutActions = {
  toggleSidebar: () => {
    sidebarVisible.update(visible => !visible);
  },
  
  showSidebar: () => {
    sidebarVisible.set(true);
  },
  
  hideSidebar: () => {
    sidebarVisible.set(false);
  },
  
  setCurrentClient: (client: Client | null) => {
    currentClient.set(client);
  }
};

// Initialize with mock client data for now (will be replaced with API data)
if (browser) {
  // Mock Vital Planet client data
  currentClient.set({
    id: 'vital-planet-uuid',
    name: 'Vital Planet',
    client_type: 'business',
    attributes: {
      name: 'Vital Planet',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  });
}