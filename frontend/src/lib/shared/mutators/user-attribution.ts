/**
 * User Attribution Mutator
 * Automatically adds created_by_id and updated_by_id fields to records
 */

import { getCurrentUser } from '../../auth/current-user';
import type { MutatorContext, MutatorFunction } from '../base-mutator';

/**
 * Add user attribution fields to data
 * - For new records: adds both created_by_id and updated_by_id
 * - For updates: only adds updated_by_id (removes created_by_id to prevent overwrites)
 * 
 * @param data - The record data being created/updated
 * @param context - Mutator context with user and action info
 * @returns Modified data with user attribution fields
 * @throws Error if no authenticated user is available
 */
export const addUserAttribution: MutatorFunction<any> = (data, context) => {
  // Get user from context or global current user
  const currentUser = context.user || getCurrentUser();
  
  if (!currentUser) {
    throw new Error('No authenticated user for attribution');
  }
  
  // For new records (explicit create action)
  if (context.action === 'create') {
    return {
      ...data,
      created_by_id: currentUser.id,
      updated_by_id: currentUser.id
    };
  }
  
  // For updates - remove created_by_id to prevent overwriting
  if (context.action === 'update') {
    const { created_by_id, ...updateData } = data;
    return {
      ...updateData,
      updated_by_id: currentUser.id
    };
  }
  
  // Fallback: if no explicit action, check for id (though this shouldn't happen)
  if (!data.id) {
    return {
      ...data,
      created_by_id: currentUser.id,
      updated_by_id: currentUser.id
    };
  } else {
    const { created_by_id, ...updateData } = data;
    return {
      ...updateData,
      updated_by_id: currentUser.id
    };
  }
};

/**
 * Type-safe version for models with user tracking fields
 */
export interface UserTrackable {
  created_by_id?: string;
  updated_by_id?: string;
}

export function addUserAttributionTyped<T extends UserTrackable>(
  data: Partial<T>,
  context: MutatorContext
): Partial<T> {
  return addUserAttribution(data, context) as Partial<T>;
}