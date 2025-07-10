import { useQuery } from 'zero-svelte-query';
import { getZero } from './client';

/**
 * Zero query hook for fetching all clients
 * Replaces: Any potential future useClientsQuery()
 */
export function useClientsQuery() {
  const zero = getZero();
  return useQuery(zero.query.clients
    .orderBy('name_normalized', 'asc'));
}

/**
 * Zero query hook for a specific client by ID
 */
export function useClientQuery(id: string, enabled: boolean = true) {
  if (!enabled || !id) {
    return { current: null, resultType: 'unknown' as const };
  }
  
  const zero = getZero();
  return useQuery(zero.query.clients
    .where('id', id)
    .one());
}

/**
 * Zero query hook for a specific client by name (since UUID doesn't exist in schema)
 */
export function useClientByNameQuery(name: string, enabled: boolean = true) {
  if (!enabled || !name) {
    return { current: null, resultType: 'unknown' as const };
  }
  
  const zero = getZero();
  return useQuery(zero.query.clients
    .where('name', name)
    .one());
}

/**
 * Zero query hook for a client with all relationships
 */
export function useClientWithRelationsQuery(id: string, enabled: boolean = true) {
  if (!enabled || !id) {
    return { current: null, resultType: 'unknown' as const };
  }
  
  const zero = getZero();
  return useQuery(zero.query.clients
    .where('id', id)
    .related('jobs', (jobs) => 
      jobs.orderBy('created_at', 'desc')
    )
    .related('people', (people) => 
      people.orderBy('name', 'asc')
    )
    .related('devices', (devices) => 
      devices.orderBy('name', 'asc')
    )
    .one());
}

/**
 * Zero query hook for clients with pagination simulation
 * (Zero handles this efficiently with reactive queries)
 */
export function useClientsPaginatedQuery(options: {
  page?: number;
  per_page?: number;
  search?: string;
} = {}) {
  const { page = 1, per_page = 20, search } = options;
  
  const zero = getZero();
  let query = zero.query.clients;
  
  // Add search filter if provided
  if (search) {
    query = query.where('name_normalized', 'LIKE', `%${search.toLowerCase()}%`);
  }
  
  // Note: Zero doesn't support offset() in current API
  // Client-side pagination will be handled by the reactive query system
  query = query
    .orderBy('name_normalized', 'asc')
    .limit(per_page);
    
  return useQuery(query);
}

/**
 * Zero query hook for client search/lookup
 */
export function useClientSearchQuery(searchTerm: string, enabled: boolean = true) {
  if (!enabled || !searchTerm || searchTerm.length < 2) {
    return { current: [], resultType: 'unknown' as const };
  }
  
  const zero = getZero();
  return useQuery(zero.query.clients
    .where('name_normalized', 'LIKE', `%${searchTerm.toLowerCase()}%`)
    .orderBy('name_normalized', 'asc')
    .limit(10)); // Limit search results
}

// Zero mutations for client operations

/**
 * Create a new client
 */
export async function createClient(clientData: {
  name: string;
  client_type?: string;
}) {
  const zero = getZero();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  // Create normalized name for consistent searching/sorting
  const name_normalized = clientData.name.toLowerCase().trim();

  await zero.mutate.clients.insert({
    id,
    name: clientData.name,
    name_normalized,
    client_type: clientData.client_type || null,
    created_at: now,
    updated_at: now,
  });

  return { id };
}

/**
 * Update a client
 */
export async function updateClient(id: string, data: Partial<{
  name: string;
  client_type: string;
}>) {
  const zero = getZero();
  const now = new Date().toISOString();
  
  const updateData: any = {
    id,
    updated_at: now,
    ...data,
  };
  
  // Update normalized name if name is being changed
  if (data.name) {
    updateData.name_normalized = data.name.toLowerCase().trim();
  }

  await zero.mutate.clients.update(updateData);
}

/**
 * Delete a client (hard delete - no soft delete available)
 */
export async function deleteClient(id: string) {
  const zero = getZero();
  await zero.mutate.clients.delete({
    id,
  });
}

/**
 * Get client statistics
 * This could be enhanced with Zero's aggregation capabilities
 */
export function useClientStatsQuery(clientId: string, enabled: boolean = true) {
  if (!enabled || !clientId) {
    return { current: [], resultType: 'unknown' as const };
  }
  
  const zero = getZero();
  return useQuery(zero.query.jobs
    .where('client_id', clientId)
    .related('tasks'));
}

/**
 * Derived hook for client lookup functionality
 */
export function useClientLookup() {
  const clientsQuery = useClientsQuery();
  
  return {
    data: clientsQuery,
    isLoading: !clientsQuery,
    error: null, // Zero handles errors internally
    getClientById: (id: string) => {
      if (!clientsQuery.current) return undefined;
      return clientsQuery.current.find((c: any) => c.id === id);
    },
    getClientsByIds: (ids: string[]) => {
      if (!clientsQuery.current) return [];
      return ids.map(id => 
        clientsQuery.current.find((c: any) => c.id === id)
      ).filter(Boolean);
    },
    searchClients: (term: string) => {
      if (!clientsQuery.current || !term) return [];
      const normalizedTerm = term.toLowerCase();
      return clientsQuery.current.filter((c: any) => 
        c.name_normalized.includes(normalizedTerm)
      );
    }
  };
}