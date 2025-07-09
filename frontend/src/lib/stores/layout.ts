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

// Layout state stores
let sidebarVisible = $state(true);
let currentClient = $state<Client | null>(null);
let currentJob = $state<PopulatedJob | null>(null);

// Mobile breakpoint detection
let isMobile = $state(false);

// Export reactive state for external access
export { sidebarVisible, currentClient, currentJob, isMobile };

// Initialize mobile detection if in browser
if (browser) {
  const mediaQuery = window.matchMedia('(max-width: 768px)');
  isMobile = mediaQuery.matches;
  
  mediaQuery.addEventListener('change', (e) => {
    isMobile = e.matches;
    // Auto-hide sidebar on mobile by default
    if (e.matches) {
      sidebarVisible = false;
    } else {
      sidebarVisible = true;
    }
  });
}

// Derived stores
export const currentPage = $derived.by(() => {
  const $page = page;
  if (!$page?.route?.id) return 'home';
  
  // Extract page type from route
  if ($page.route.id === '/jobs/[id]') return 'job-detail';
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
    sidebarVisible = !sidebarVisible;
  },
  
  showSidebar: () => {
    sidebarVisible = true;
  },
  
  hideSidebar: () => {
    sidebarVisible = false;
  },
  
  setCurrentClient: (client: Client | null) => {
    currentClient = client;
  },
  
  setCurrentJob: (job: PopulatedJob | null) => {
    currentJob = job;
  },
  
  // Getters for current state
  get sidebarVisible() {
    return sidebarVisible;
  },
  
  get currentClient() {
    return currentClient;
  },
  
  get currentJob() {
    return currentJob;
  },
  
  get isMobile() {
    return isMobile;
  }
};

// Initialize with mock client data for now (will be replaced with API data)
if (browser) {
  // Mock Vital Planet client data
  currentClient = {
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