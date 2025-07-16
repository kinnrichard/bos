import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { api } from '$lib/api';
import type { ClientResource } from '$lib/types';

export const load: PageLoad = async ({ params }) => {
  try {
    const clientData = await api.get<{ data: ClientResource }>(`/clients/${params.uuid}`);
    
    // Transform JsonApiResource to simple object for ClientInfo component
    const client = {
      id: clientData.data.id,
      name: clientData.data.attributes.name,
      created_at: clientData.data.attributes.created_at,
      updated_at: clientData.data.attributes.updated_at
    };
    
    return {
      client
    };
  } catch (err) {
    console.error('Error loading client:', err);
    throw error(404, 'Client not found');
  }
};