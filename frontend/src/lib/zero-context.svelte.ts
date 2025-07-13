// Zero Context for Svelte 5
// Makes Zero functions available throughout the app via context API

import { getContext, setContext } from 'svelte';
import type { ZeroClient } from './zero';
import { 
  getZero, 
  initZero, 
  getZeroState,
  Job,
  User,
  Client,
  Task,
  createJob,
  updateJob,
  deleteJob,
  createUser,
  updateUser,
  createClient,
  updateClient,
  createTask,
  updateTask,
  discardTask,
  undiscardTask
} from './zero';

const ZERO_CONTEXT_KEY = Symbol('zero');

export interface ZeroContext {
  // Client functions
  getZero: typeof getZero;
  initZero: typeof initZero;
  getZeroState: typeof getZeroState;
  
  // ActiveRecord-style queries
  Job: typeof Job;
  User: typeof User;
  Client: typeof Client;
  Task: typeof Task;
  
  // CRUD mutations
  createJob: typeof createJob;
  updateJob: typeof updateJob;
  deleteJob: typeof deleteJob;
  createUser: typeof createUser;
  updateUser: typeof updateUser;
  createClient: typeof createClient;
  updateClient: typeof updateClient;
  createTask: typeof createTask;
  updateTask: typeof updateTask;
  discardTask: typeof discardTask;
  undiscardTask: typeof undiscardTask;
  
  // Add other Zero functions as needed
}

export function createZeroContext(): ZeroContext {
  const context: ZeroContext = {
    // Client functions
    getZero,
    initZero,
    getZeroState,
    
    // ActiveRecord-style queries
    Job,
    User,
    Client,
    Task,
    
    // CRUD mutations
    createJob,
    updateJob,
    deleteJob,
    createUser,
    updateUser,
    createClient,
    updateClient,
    createTask,
    updateTask,
    discardTask,
    undiscardTask,
  };
  
  return setContext(ZERO_CONTEXT_KEY, context);
}

export function getZeroContext(): ZeroContext {
  const context = getContext<ZeroContext>(ZERO_CONTEXT_KEY);
  if (!context) {
    throw new Error('Zero context not found. Make sure createZeroContext() is called in a parent component.');
  }
  return context;
}