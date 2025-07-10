import { useQuery } from 'zero-svelte-query';
import { getZero } from './client';

/**
 * Zero query hook for fetching all clients
 * Replaces: Any potential future useClientsQuery()
 */
export function useClientsQuery() {
  const zero = getZero();
  return useQuery(zero.query.clients
    .where('deleted_at', 'IS', null) // Only active clients
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
    .where('deleted_at', 'IS', null)
    .one());
}

/**
 * Zero query hook for a specific client by UUID
 */
export function useClientByUuidQuery(uuid: string, enabled: boolean = true) {
  if (!enabled || !uuid) {
    return { current: null, resultType: 'unknown' as const };
  }
  
  const zero = getZero();
  return useQuery(zero.query.clients
    .where('uuid', uuid)
    .where('deleted_at', 'IS', null)
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
    .where('deleted_at', 'IS', null)
    .related('jobs', (jobs) => 
      jobs.where('deleted_at', 'IS', null)
          .orderBy('created_at', 'desc')
    )
    .related('people', (people) => 
      people.where('deleted_at', 'IS', null)
            .orderBy('name', 'asc')
    )
    .related('devices', (devices) => 
      devices.where('deleted_at', 'IS', null)
             .orderBy('name', 'asc')
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
  let query = zero.query.clients
    .where('deleted_at', 'IS', null);
  
  // Add search filter if provided
  if (search) {
    query = query.where('name_normalized', 'LIKE', `%${search.toLowerCase()}%`);
  }
  
  query = query
    .orderBy('name_normalized', 'asc')
    .limit(per_page)
    .offset((page - 1) * per_page);
    
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
    .where('deleted_at', 'IS', null)
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
  email?: string;
  phone?: string;
  address?: string;
}) {
  const zero = getZero();
  const id = crypto.randomUUID();
  const uuid = crypto.randomUUID();
  const now = new Date().toISOString();
  
  // Create normalized name for consistent searching/sorting
  const name_normalized = clientData.name.toLowerCase().trim();

  await zero.mutate.clients.insert({
    id,
    uuid,
    name: clientData.name,
    name_normalized,
    email: clientData.email || null,
    phone: clientData.phone || null,
    address: clientData.address || null,
    created_at: now,
    updated_at: now,
  });

  return { id, uuid };
}

/**
 * Update a client
 */
export async function updateClient(id: string, data: Partial<{
  name: string;
  email: string;
  phone: string;
  address: string;
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
 * Delete a client (soft delete)
 */
export async function deleteClient(id: string) {
  const zero = getZero();
  const now = new Date().toISOString();

  await zero.mutate.clients.update({
    id,
    deleted_at: now,
    updated_at: now,
  });
}

/**
 * Restore a deleted client
 */
export async function restoreClient(id: string) {
  const zero = getZero();
  const now = new Date().toISOString();

  await zero.mutate.clients.update({
    id,
    deleted_at: null,
    updated_at: now,
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
    .where('deleted_at', 'IS', null)
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
      if (!clientsQuery.value) return undefined;
      return clientsQuery.value.find((c: any) => c.id === id);
    },
    getClientByUuid: (uuid: string) => {
      if (!clientsQuery.value) return undefined;  
      return clientsQuery.value.find((c: any) => c.uuid === uuid);
    },
    getClientsByIds: (ids: string[]) => {
      if (!clientsQuery.value) return [];
      return ids.map(id => 
        clientsQuery.value.find((c: any) => c.id === id)
      ).filter(Boolean);
    },
    searchClients: (term: string) => {
      if (!clientsQuery.value || !term) return [];
      const normalizedTerm = term.toLowerCase();
      return clientsQuery.value.filter((c: any) => 
        c.name_normalized.includes(normalizedTerm)
      );
    }
  };
}