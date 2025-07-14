import { page } from '$app/stores';
import { browser } from '$app/environment';
import type { PopulatedJob } from '$lib/types/job';

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
  currentJob: null as PopulatedJob | null,
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
  return clientType === 'business' ? '🏢' : '👤';
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
  },
  
  setCurrentJob: (job: PopulatedJob | null) => {
    console.log('[LayoutStore] setCurrentJob called:', {
      newJobId: job?.id,
      newJobStatus: job?.status,
      currentJobId: layout.currentJob?.id,
      currentJobStatus: layout.currentJob?.status,
      timestamp: Date.now(),
      stackTrace: new Error().stack?.split('\n').slice(1, 4) // Show call stack
    });
    layout.currentJob = job;
  }
};

// Initialize with mock client data for now (will be replaced with API data)
if (browser) {
  // Mock Vital Planet client data
  layout.currentClient = {
    id: 'vital-planet-uuid',
    name: 'Vital Planet',
    client_type: 'business',
    attributes: {
      name: 'Vital Planet',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  };
}