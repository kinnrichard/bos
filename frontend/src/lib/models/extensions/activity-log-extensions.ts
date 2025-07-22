/**
 * Activity Log Extensions
 * 
 * Extends the ReactiveActivityLog model with computed properties
 * for UI display and navigation.
 */

import { ReactiveActivityLog } from '../reactive-activity-log';

// Extend the ReactiveActivityLog prototype with computed properties
Object.defineProperties(ReactiveActivityLog.prototype, {
  formattedMessage: {
    get(this: ReactiveActivityLog) {
      // Handle different action types and build appropriate messages
      const action = this.action || '';
      const loggableType = this.loggable_type || '';
      
      // For now, return a simple formatted message
      // This can be enhanced based on metadata structure
      if (this.metadata?.message) {
        return this.metadata.message;
      }
      
      // Default message format
      return `${action} ${loggableType}`.trim();
    }
  },
  
  loggableEmoji: {
    get(this: ReactiveActivityLog) {
      return this.getEntityEmoji();
    }
  },
  
  isLinkable: {
    get(this: ReactiveActivityLog) {
      return this.action !== 'deleted' && !!this.loggable_id;
    }
  },
  
  loggablePath: {
    get(this: ReactiveActivityLog) {
      if (!this.isLinkable) return null;
      
      switch (this.loggable_type) {
        case 'Client':
          return `/clients/${this.loggable_id}`;
        case 'Job':
          // If we have both client_id and job_id, use the nested route
          return this.client_id && this.loggable_id 
            ? `/clients/${this.client_id}/jobs/${this.loggable_id}`
            : `/jobs/${this.loggable_id}`;
        case 'Task':
          return `/tasks/${this.loggable_id}`;
        case 'Person':
          return `/people/${this.loggable_id}`;
        case 'Device':
          return `/devices/${this.loggable_id}`;
        default:
          return null;
      }
    }
  }
});

// Add method to prototype
ReactiveActivityLog.prototype.getEntityEmoji = function(this: ReactiveActivityLog) {
  switch (this.loggable_type) {
    case 'Client':
      // Check if client is loaded and has client_type
      if (this.client?.client_type === 'business') {
        return '🏢';
      } else if (this.client?.client_type === 'residential') {
        return '🏠';
      }
      // Default for client when type is unknown
      return '👤';
    case 'Job':
      return '💼';
    case 'Task':
      return '📋';
    case 'Person':
      return '👤';
    case 'Device':
      return '💻';
    case 'Note':
      return '📝';
    default:
      return '📄';
  }
};

// TypeScript augmentation to add the new properties and methods
declare module '../reactive-activity-log' {
  interface ReactiveActivityLog {
    formattedMessage: string;
    loggableEmoji: string;
    isLinkable: boolean;
    loggablePath: string | null;
    getEntityEmoji(): string;
  }
}