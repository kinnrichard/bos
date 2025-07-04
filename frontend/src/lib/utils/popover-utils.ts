import { POPOVER_ERRORS } from './popover-constants';

// Common error handling for popover components
export function getPopoverErrorMessage(error: any): string {
  if (!error) return '';
  
  const errorCode = error.code || (error as any)?.code;
  
  switch (errorCode) {
    case 'INVALID_CSRF_TOKEN':
      return POPOVER_ERRORS.CSRF_TOKEN;
    default:
      return POPOVER_ERRORS.GENERIC;
  }
}

// Utility to determine if an update should be blocked due to loading state
export function shouldBlockUpdate(isLoading: boolean, hasRequiredData: boolean): boolean {
  return isLoading || !hasRequiredData;
}

// Utility to safely access nested object properties common in API responses
export function safeGet<T>(obj: any, path: string, defaultValue: T): T {
  try {
    return path.split('.').reduce((current, key) => current?.[key], obj) ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

// Common validation for user data in technician contexts
export function validateUserData(user: any): boolean {
  return !!(user?.id && user?.attributes?.name);
}

// Common validation for job data in popover contexts
export function validateJobData(job: any): boolean {
  return !!(job?.id && job?.attributes);
}

// Utility to create a debounced function for API calls
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Utility to safely parse and format dates for form inputs
export function formatDateForInput(dateString: string | null | undefined): string {
  if (!dateString) return '';
  
  try {
    // Ensure the date is in YYYY-MM-DD format for date inputs
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    return date.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

// Utility to safely parse and format times for form inputs
export function formatTimeForInput(timeString: string | null | undefined): string {
  if (!timeString) return '';
  
  try {
    // Handle various time formats and convert to HH:MM
    if (timeString.includes(':')) {
      const [hours, minutes] = timeString.split(':');
      const h = parseInt(hours, 10);
      const m = parseInt(minutes, 10);
      
      if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
        return '';
      }
      
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
    
    return '';
  } catch {
    return '';
  }
}

// Utility for optimistic updates - creates a copy of data with updates applied
export function createOptimisticUpdate<T extends Record<string, any>>(
  original: T,
  updates: Partial<T>
): T {
  return {
    ...original,
    ...updates,
  };
}

// Utility to check if two sets have the same contents (for comparing selected IDs)
export function setsEqual<T>(set1: Set<T>, set2: Set<T>): boolean {
  if (set1.size !== set2.size) return false;
  
  for (const item of set1) {
    if (!set2.has(item)) return false;
  }
  
  return true;
}

// Utility to create a Set from an array of objects with an ID property
export function createIdSet<T extends { id: string }>(items: T[]): Set<string> {
  return new Set(items.map(item => item.id).filter(Boolean));
}