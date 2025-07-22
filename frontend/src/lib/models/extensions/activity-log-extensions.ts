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
      const action = this.action || '';
      const loggableType = this.loggable_type || '';
      const metadata = this.metadata || {};
      
      // Custom message if provided
      if (metadata.message) {
        return metadata.message;
      }
      
      // Get the entity name from metadata
      const entityName = metadata.name || `${loggableType} #${this.loggable_id}`;
      
      // Build message based on action type
      switch (action) {
        case 'created':
          return `Created ${loggableType.toLowerCase()} "${entityName}"`;
        case 'updated':
          return `Updated ${loggableType.toLowerCase()} "${entityName}"`;
        case 'deleted':
        case 'discarded':
          return `Deleted ${loggableType.toLowerCase()} "${entityName}"`;
        case 'status_changed':
          if (metadata.new_status_label) {
            return `Changed status to ${metadata.new_status_label} for "${entityName}"`;
          }
          return `Changed status for "${entityName}"`;
        case 'assigned':
          return `Assigned "${entityName}" to someone`;
        case 'unassigned':
          return `Unassigned "${entityName}"`;
        case 'renamed':
          if (metadata.old_name) {
            return `Renamed from "${metadata.old_name}" to "${entityName}"`;
          }
          return `Renamed ${loggableType.toLowerCase()} to "${entityName}"`;
        default:
          // For custom actions, try to humanize the action
          const humanizedAction = action.replace(/_/g, ' ').toLowerCase();
          return `${humanizedAction} ${loggableType.toLowerCase()} "${entityName}"`;
      }
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