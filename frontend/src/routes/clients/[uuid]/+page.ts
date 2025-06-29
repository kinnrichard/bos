import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { apiClient } from '$lib/api';

export const load: PageLoad = async ({ params }) => {
  try {
    const response = await apiClient.get(`/clients/${params.uuid}`);
    
    if (!response.ok) {
      throw error(response.status, 'Client not found');
    }

    const client = await response.json();
    
    return {
      client: client.data
    };
  } catch (err) {
    console.error('Error loading client:', err);
    throw error(404, 'Client not found');
  }
};