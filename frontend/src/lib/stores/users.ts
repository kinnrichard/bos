import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { usersService } from '$lib/api/users';
import type { User } from '$lib/types/job';

// User cache store
const users = writable<User[]>([]);
const isLoading = writable<boolean>(false);
const error = writable<string | null>(null);

// Derived store for user lookup by ID
export const userLookup = derived(users, ($users) => {
  const lookup = new Map<string, User>();
  $users.forEach(user => {
    lookup.set(user.id, user);
  });
  return lookup;
});

// Actions for managing user cache
export const userStore = {
  // Subscribe to the users store
  subscribe: users.subscribe,
  
  // Get loading state
  isLoading: { subscribe: isLoading.subscribe },
  
  // Get error state
  error: { subscribe: error.subscribe },
  
  // Load all users into cache
  async loadUsers(): Promise<void> {
    if (!browser) return;
    
    try {
      isLoading.set(true);
      error.set(null);
      
      const allUsers = await usersService.getUsers();
      users.set(allUsers);
      
      console.log(`[UserStore] Cached ${allUsers.length} users`);
    } catch (err: any) {
      console.error('[UserStore] Failed to load users:', err);
      error.set(err.message || 'Failed to load users');
    } finally {
      isLoading.set(false);
    }
  },
  
  // Get user by ID from cache
  getUser(id: string): User | undefined {
    let lookup: Map<string, User>;
    userLookup.subscribe(value => lookup = value)();
    return lookup!.get(id);
  },
  
  // Get multiple users by IDs
  getUsers(ids: string[]): User[] {
    let lookup: Map<string, User>;
    userLookup.subscribe(value => lookup = value)();
    return ids.map(id => lookup!.get(id)).filter(Boolean) as User[];
  },
  
  // Check if users are loaded
  isLoaded(): boolean {
    let currentUsers: User[];
    users.subscribe(value => currentUsers = value)();
    return currentUsers!.length > 0;
  },
  
  // Clear cache
  clear(): void {
    users.set([]);
    error.set(null);
  }
};

// Auto-load users when store is imported (only in browser)
if (browser) {
  userStore.loadUsers();
}