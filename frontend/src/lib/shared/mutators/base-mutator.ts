export interface MutatorContext {
  tx?: any; // Zero.js transaction
  user?: { id: string; [key: string]: any };
  offline?: boolean;
  action?: 'create' | 'update' | 'destroy';
  
  // Activity logging support
  skipActivityLogging?: boolean;
  environment?: string;
  customAction?: string;
  metadata?: Record<string, any>;
  changes?: Record<string, [any, any]>; // [oldValue, newValue] for each changed field
  
  [key: string]: any;
}

export abstract class BaseMutator<T = any> {
  mutate(data: T, context?: MutatorContext): T | Promise<T> {
    throw new Error('Must be implemented by subclass');
  }
}

export type MutatorFunction<T = any> = (
  data: T,
  context?: MutatorContext
) => T | Promise<T>;