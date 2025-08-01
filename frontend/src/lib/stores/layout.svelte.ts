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

// Client edit callbacks
export interface ClientEditCallbacks {
  onSave: () => void | Promise<void>;
  onCancel: () => void;
  onEdit?: () => void;
}

// Layout state object - proper Svelte 5 pattern
export const layout = $state({
  sidebarVisible: true,
  currentClient: null as Client | null,
  isMobile: false,
  // Client edit state
  isEditingClient: false,
  isNewClient: false,
  isSavingClient: false,
  canSaveClient: true,
  clientEditCallbacks: null as ClientEditCallbacks | null,
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
  },

  // Client edit actions
  setClientEditState: (editing: boolean, isNew: boolean = false) => {
    layout.isEditingClient = editing;
    layout.isNewClient = isNew;
  },

  setClientEditCallbacks: (callbacks: ClientEditCallbacks | null) => {
    layout.clientEditCallbacks = callbacks;
  },

  setSavingClient: (saving: boolean) => {
    layout.isSavingClient = saving;
  },

  setCanSaveClient: (canSave: boolean) => {
    layout.canSaveClient = canSave;
  },

  clearClientEditState: () => {
    layout.isEditingClient = false;
    layout.isNewClient = false;
    layout.isSavingClient = false;
    layout.canSaveClient = true;
    layout.clientEditCallbacks = null;
  },
};

// Current client will be set based on page context
