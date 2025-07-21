// Clients search store - for filtering clients on the listing page
export const clientsSearch = $state({
  searchQuery: '' as string,
  searchFields: ['name', 'name_normalized'] as string[]
});

// Filter function for clients
export function shouldShowClient(client: any): boolean {
  // If no search query, show all clients
  if (!clientsSearch.searchQuery.trim()) {
    return true;
  }
  
  const query = clientsSearch.searchQuery.toLowerCase().trim();
  
  // Search in client name
  if (client.name && client.name.toLowerCase().includes(query)) {
    return true;
  }
  
  // Search in normalized name
  if (client.name_normalized && client.name_normalized.toLowerCase().includes(query)) {
    return true;
  }
  
  return false;
}

// Actions for managing clients search
export const clientsSearchActions = {
  setSearchQuery: (query: string) => {
    clientsSearch.searchQuery = query;
  },
  
  clearSearch: () => {
    clientsSearch.searchQuery = '';
  }
};