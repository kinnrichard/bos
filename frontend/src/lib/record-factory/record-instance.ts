// RecordInstance: Generic base class for ActiveRecord-style instance methods
// Provides Rails-compatible update(), delete(), restore() methods
// Extended by generated model-specific instance classes

/**
 * Generic interface for Zero.js mutation functions
 */
export interface ZeroMutations<T> {
  update: (id: string, data: Partial<T>) => Promise<{ id: string }>;
  delete: (id: string) => Promise<{ id: string }>;
  restore: (id: string) => Promise<{ id: string }>;
}

/**
 * Base class for ActiveRecord-style instance methods
 * Extended by generated model-specific classes (TaskInstance, JobInstance, etc.)
 */
export abstract class RecordInstance<T extends { id: string }> {
  protected abstract mutations: ZeroMutations<T>;
  
  constructor(protected data: T) {
    // Create proxy to make all properties reactive and accessible
    return new Proxy(this, {
      get(target, prop, receiver) {
        // If accessing a method or internal property, return it directly
        if (typeof prop === 'string' && (prop in target || typeof target[prop as keyof typeof target] === 'function')) {
          return Reflect.get(target, prop, receiver);
        }
        
        // Otherwise, proxy to the underlying data
        if (typeof prop === 'string' && prop in target.data) {
          return (target.data as any)[prop];
        }
        
        return Reflect.get(target, prop, receiver);
      },
      
      set(target, prop, value, receiver) {
        // If setting a data property, update the underlying data
        if (typeof prop === 'string' && prop in target.data) {
          (target.data as any)[prop] = value;
          return true;
        }
        
        // Otherwise, set on the instance
        return Reflect.set(target, prop, value, receiver);
      }
    });
  }

  /**
   * Rails-compatible update method
   * Updates multiple attributes in a single database operation
   * 
   * @param attributes - Partial object with fields to update
   * @returns Promise resolving to the updated record ID
   * 
   * @example
   * ```typescript
   * await task.update({ title: 'New Title', status: 'completed' });
   * ```
   */
  async update(attributes: Partial<T>): Promise<{ id: string }> {
    if (!attributes || Object.keys(attributes).length === 0) {
      throw new Error('Update attributes are required');
    }

    try {
      const result = await this.mutations.update(this.data.id, attributes);
      
      // Optimistically update local data
      Object.assign(this.data, attributes);
      
      return result;
    } catch (error) {
      throw new Error(`Failed to update record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Rails-compatible delete method (soft deletion)
   * Sets deleted_at timestamp without removing the record
   * 
   * @returns Promise resolving to the deleted record ID
   * 
   * @example
   * ```typescript
   * await task.delete();
   * ```
   */
  async delete(): Promise<{ id: string }> {
    try {
      const result = await this.mutations.delete(this.data.id);
      
      // Optimistically update local data
      (this.data as any).deleted_at = Date.now();
      
      return result;
    } catch (error) {
      throw new Error(`Failed to delete record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Rails-compatible restore method
   * Clears deleted_at timestamp to restore soft-deleted records
   * 
   * @returns Promise resolving to the restored record ID
   * 
   * @example
   * ```typescript
   * await task.restore();
   * ```
   */
  async restore(): Promise<{ id: string }> {
    try {
      const result = await this.mutations.restore(this.data.id);
      
      // Optimistically update local data
      (this.data as any).deleted_at = null;
      
      return result;
    } catch (error) {
      throw new Error(`Failed to restore record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the raw data object
   * Useful for serialization or when you need the plain data
   */
  get rawData(): T {
    return this.data;
  }

  /**
   * Get the record ID
   */
  get id(): string {
    return this.data.id;
  }

  /**
   * Check if record is soft deleted
   */
  get isDeleted(): boolean {
    return !!(this.data as any).deleted_at;
  }

  /**
   * Rails-compatible inspect method for debugging
   */
  inspect(): string {
    return `#<${this.constructor.name} id: ${this.data.id}>`;
  }

  /**
   * Override toString for debugging
   */
  toString(): string {
    return this.inspect();
  }
}

/**
 * Type helper for creating instance classes
 */
export type RecordInstanceConstructor<T extends { id: string }> = new (data: T) => RecordInstance<T>;

/**
 * Factory function type for creating instances
 */
export type InstanceFactory<T extends { id: string }> = (data: T) => RecordInstance<T>;