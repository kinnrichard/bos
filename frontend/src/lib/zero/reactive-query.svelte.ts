// Enhanced ActiveRecord-Style Reactive API for Zero.js
// Combines Zero's native addListener with clean ActiveRecord syntax
// Works seamlessly in both Svelte components and vanilla JavaScript

import { getZero } from './zero-client';

/**
 * Reactive query wrapper for Zero.js that provides ActiveRecord-style API
 * Uses Zero's native addListener for real-time updates without polling
 * 
 * @example
 * ```typescript
 * // In Svelte component - reactive array
 * const activeJobs = Job.where({ status: 'active' });
 * // activeJobs.data automatically updates in template
 * 
 * // In vanilla JS - imperative access
 * const activeJobs = Job.where({ status: 'active' });
 * const currentData = activeJobs.current;
 * activeJobs.subscribe((newData) => console.log('Updated:', newData));
 * ```
 */
export class ReactiveQuery<T> {
  // Use Svelte 5's $state rune for proper reactivity tracking
  private _state = $state({
    data: [] as T[],
    isLoading: true,
    error: null as Error | null
  });
  
  private view: any = null;
  private removeListener: (() => void) | null = null;
  private retryTimeoutId: number | null = null;
  private subscribers: Array<(data: T[], meta: { isLoading: boolean; error: Error | null }) => void> = [];
  private isDestroyed = false;
  
  constructor(
    private getQueryBuilder: () => any | null,
    private defaultValue: T[] = [],
    private ttl: string | undefined = undefined
  ) {
    // Initialize with Svelte 5 $state rune for proper reactivity
    this._state.data = defaultValue;
    this._state.isLoading = true;
    this._state.error = null;
    
    // Set up Zero listener
    this.initializeQuery();
  }
  
  // Reactive getters for Svelte components - now properly tracked by Svelte
  get data(): T[] { return this._state.data; }
  get isLoading(): boolean { return this._state.isLoading; }
  get error(): Error | null { return this._state.error; }
  
  // Imperative access for vanilla JavaScript
  get current(): T[] { return this._state.data; }
  get loading(): boolean { return this._state.isLoading; }
  
  /**
   * Subscribe to data changes (for vanilla JS usage)
   * @param callback Function called when data changes
   * @returns Unsubscribe function
   */
  subscribe(callback: (data: T[], meta: { isLoading: boolean; error: Error | null }) => void): () => void {
    this.subscribers.push(callback);
    
    // Immediately call with current state
    callback(this._state.data, { isLoading: this._state.isLoading, error: this._state.error });
    
    // Return unsubscribe function
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }
  
  /**
   * Refresh the query manually (usually not needed with Zero's reactivity)
   */
  refresh(): void {
    if (!this.isDestroyed) {
      this.cleanup();
      this.initializeQuery();
    }
  }
  
  /**
   * Clean up resources and stop listening
   */
  destroy(): void {
    this.isDestroyed = true;
    this.cleanup();
    this.subscribers = [];
  }
  
  private initializeQuery(): void {
    const tryInitialize = () => {
      if (this.isDestroyed) return;
      
      try {
        // Get queryBuilder from function
        const queryBuilder = this.getQueryBuilder();
        
        // Check if queryBuilder is available
        if (!queryBuilder) {
          console.log('🔍 ReactiveQuery: Query builder not ready, retrying in 100ms...');
          this.updateState(this.defaultValue, true, null);
          this.retryTimeoutId = setTimeout(tryInitialize, 100) as any;
          return;
        }
        
        console.log('🔍 ReactiveQuery: Creating materialized view with TTL:', this.ttl);
        this.view = this.ttl 
          ? queryBuilder.materialize({ ttl: this.ttl })
          : queryBuilder.materialize();
        
        // Set up Zero's native listener for real-time updates
        this.removeListener = this.view.addListener((newData: T[]) => {
          if (this.isDestroyed) return;
          
          console.log('🔥 ZERO DATA CHANGED! New count:', newData?.length || 0);
          this.updateState(newData || this.defaultValue, false, null);
        });
        
        // Get initial data synchronously
        const initialData = this.view.data;
        if (initialData !== undefined && initialData !== null) {
          this.updateState(initialData, false, null);
        }
        
        console.log('🔍 ReactiveQuery: Setup complete with initial data:', initialData?.length || 'null');
        
      } catch (err) {
        if (this.isDestroyed) return;
        
        console.error('🔍 ReactiveQuery: Error during setup:', err);
        const error = err instanceof Error ? err : new Error('Unknown error');
        this.updateState(this.defaultValue, false, error);
      }
    };
    
    // Start initialization
    tryInitialize();
  }
  
  private updateState(data: T[], isLoading: boolean, error: Error | null): void {
    // Update Svelte 5 $state - this will automatically trigger reactivity
    this._state.data = data;
    this._state.isLoading = isLoading;
    this._state.error = error;
    
    // Notify subscribers for vanilla JS usage
    this.subscribers.forEach(callback => {
      try {
        callback(data, { isLoading, error });
      } catch (err) {
        console.error('ReactiveQuery subscriber error:', err);
      }
    });
  }
  
  private cleanup(): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
    
    if (this.removeListener) {
      console.log('🔍 ReactiveQuery: Removing listener');
      this.removeListener();
      this.removeListener = null;
    }
    
    if (this.view) {
      console.log('🔍 ReactiveQuery: Destroying view');
      this.view.destroy();
      this.view = null;
    }
  }
}

/**
 * Reactive query wrapper for single Zero.js records
 * Provides ActiveRecord-style API for individual record queries
 * 
 * @example
 * ```typescript
 * // In Svelte component
 * const job = Job.find('job-id');
 * // job.data automatically updates
 * 
 * // In vanilla JS
 * const job = Job.find('job-id');
 * const current = job.current;
 * job.subscribe((data) => console.log('Job updated:', data));
 * ```
 */
export class ReactiveQueryOne<T> {
  // Use Svelte 5's $state rune for proper reactivity tracking
  private _state = $state({
    data: null as T | null,
    isLoading: true,
    error: null as Error | null
  });
  
  private view: any = null;
  private removeListener: (() => void) | null = null;
  private retryTimeoutId: number | null = null;
  private subscribers: Array<(data: T | null, meta: { isLoading: boolean; error: Error | null }) => void> = [];
  private isDestroyed = false;
  
  constructor(
    private getQueryBuilder: () => any | null,
    private defaultValue: T | null = null,
    private ttl: string | undefined = undefined
  ) {
    // Initialize with Svelte 5 $state rune for proper reactivity
    this._state.data = defaultValue;
    this._state.isLoading = true;
    this._state.error = null;
    
    // Set up Zero listener
    this.initializeQuery();
  }
  
  // Reactive getters for Svelte components - now properly tracked by Svelte
  get data(): T | null { return this._state.data; }
  get isLoading(): boolean { return this._state.isLoading; }
  get error(): Error | null { return this._state.error; }
  
  // Imperative access for vanilla JavaScript
  get current(): T | null { return this._state.data; }
  get loading(): boolean { return this._state.isLoading; }
  
  /**
   * Subscribe to data changes (for vanilla JS usage)
   * @param callback Function called when data changes
   * @returns Unsubscribe function
   */
  subscribe(callback: (data: T | null, meta: { isLoading: boolean; error: Error | null }) => void): () => void {
    this.subscribers.push(callback);
    
    // Immediately call with current state
    callback(this._state.data, { isLoading: this._state.isLoading, error: this._state.error });
    
    // Return unsubscribe function
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }
  
  /**
   * Refresh the query manually (usually not needed with Zero's reactivity)
   */
  refresh(): void {
    if (!this.isDestroyed) {
      this.cleanup();
      this.initializeQuery();
    }
  }
  
  /**
   * Clean up resources and stop listening
   */
  destroy(): void {
    this.isDestroyed = true;
    this.cleanup();
    this.subscribers = [];
  }
  
  private initializeQuery(): void {
    const tryInitialize = () => {
      if (this.isDestroyed) return;
      
      try {
        // Get queryBuilder from function
        const queryBuilder = this.getQueryBuilder();
        
        // Check if queryBuilder is available
        if (!queryBuilder) {
          console.log('🔍 ReactiveQueryOne: Query builder not ready, retrying in 100ms...');
          this.updateState(this.defaultValue, true, null);
          this.retryTimeoutId = setTimeout(tryInitialize, 100) as any;
          return;
        }
        
        console.log('🔍 ReactiveQueryOne: Creating materialized view with TTL:', this.ttl);
        this.view = this.ttl 
          ? queryBuilder.materialize({ ttl: this.ttl })
          : queryBuilder.materialize();
        
        // Set up Zero's native listener for real-time updates
        this.removeListener = this.view.addListener((newData: T | null) => {
          if (this.isDestroyed) return;
          
          console.log('🔥 ZERO DATA CHANGED! New data:', newData ? 'present' : 'null');
          this.updateState(newData !== undefined ? newData : this.defaultValue, false, null);
        });
        
        // Get initial data synchronously
        const initialData = this.view.data;
        if (initialData !== undefined) {
          this.updateState(initialData, false, null);
        }
        
        console.log('🔍 ReactiveQueryOne: Setup complete with initial data:', initialData ? 'present' : 'null');
        
      } catch (err) {
        if (this.isDestroyed) return;
        
        console.error('🔍 ReactiveQueryOne: Error during setup:', err);
        const error = err instanceof Error ? err : new Error('Unknown error');
        this.updateState(this.defaultValue, false, error);
      }
    };
    
    // Start initialization
    tryInitialize();
  }
  
  private updateState(data: T | null, isLoading: boolean, error: Error | null): void {
    // Update Svelte 5 $state - this will automatically trigger reactivity
    this._state.data = data;
    this._state.isLoading = isLoading;
    this._state.error = error;
    
    // Notify subscribers for vanilla JS usage
    this.subscribers.forEach(callback => {
      try {
        callback(data, { isLoading, error });
      } catch (err) {
        console.error('ReactiveQueryOne subscriber error:', err);
      }
    });
  }
  
  private cleanup(): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
    
    if (this.removeListener) {
      console.log('🔍 ReactiveQueryOne: Removing listener');
      this.removeListener();
      this.removeListener = null;
    }
    
    if (this.view) {
      console.log('🔍 ReactiveQueryOne: Destroying view');
      this.view.destroy();
      this.view = null;
    }
  }
}