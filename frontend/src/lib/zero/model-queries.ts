/**
 * Surgical .includes() Implementation for Epic-008
 * 
 * Provides Rails-like .includes() functionality without new classes or factories.
 * Simple chainable functions that work with existing ReactiveQuery system.
 * 
 * Usage:
 *   queryJobs().includes('client').orderBy('created_at', 'desc')
 *   queryJobs().includes('client', 'jobAssignments').where('id', jobId).one()
 */

import { getZero } from './zero-client';

/**
 * Creates a chainable query object with includes() support
 * Returns an object that forwards all Zero.js methods after applying relationships
 */
function createQueryChain(tableName: string, baseQuery: any) {
  // Store the relationships to apply later
  let storedRelationships: string[] = [];
  
  const chainProxy = {
    /**
     * Include related records using Zero.js .related() syntax
     * Can chain multiple relationships: .includes('client', 'assignments')
     */
    includes(...relationships: string[]) {
      storedRelationships = [...storedRelationships, ...relationships];
      return chainProxy;
    },
    
    // Forward all other methods to the baseQuery after applying relationships
    orderBy(...args: any[]) {
      if (!baseQuery) return null;
      let query = baseQuery;
      
      // Apply stored relationships
      storedRelationships.forEach(rel => {
        query = query?.related(rel);
      });
      
      return query?.orderBy(...args);
    },
    
    where(...args: any[]) {
      if (!baseQuery) return null;
      let query = baseQuery;
      
      // Apply stored relationships
      storedRelationships.forEach(rel => {
        query = query?.related(rel);
      });
      
      return query?.where(...args);
    },
    
    // Add other methods as needed
    one() {
      if (!baseQuery) return null;
      let query = baseQuery;
      
      // Apply stored relationships
      storedRelationships.forEach(rel => {
        query = query?.related(rel);
      });
      
      return query?.one();
    },
    
    all() {
      if (!baseQuery) return null;
      let query = baseQuery;
      
      // Apply stored relationships
      storedRelationships.forEach(rel => {
        query = query?.related(rel);
      });
      
      return query;
    }
  };
  
  return chainProxy;
}

/**
 * Jobs query builder with includes() support
 * Usage: queryJobs().includes('client').orderBy('created_at', 'desc')
 */
export function queryJobs() {
  const zero = getZero();
  const baseQuery = zero?.query.jobs;
  return createQueryChain('jobs', baseQuery);
}

/**
 * Clients query builder with includes() support  
 * Usage: queryClients().includes('jobs').all()
 */
export function queryClients() {
  const zero = getZero();
  const baseQuery = zero?.query.clients;
  return createQueryChain('clients', baseQuery);
}

/**
 * Tasks query builder with includes() support
 * Usage: queryTasks().includes('job').where('status', 1).all()
 */
export function queryTasks() {
  const zero = getZero();
  const baseQuery = zero?.query.tasks;
  return createQueryChain('tasks', baseQuery);
}

/**
 * Users query builder with includes() support
 * Usage: queryUsers().includes('jobAssignments').all()
 */
export function queryUsers() {
  const zero = getZero();
  const baseQuery = zero?.query.users;
  return createQueryChain('users', baseQuery);
}