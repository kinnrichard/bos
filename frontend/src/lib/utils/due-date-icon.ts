/**
 * Utility functions for calculating and selecting due date icons
 * Extracted from JobSchedulePopover to be reused across components
 */

/**
 * Calculate the number of days until a due date
 * @param due The due date to calculate from
 * @returns Number of days until due (negative if overdue), or null if no date
 */
export function getDaysUntilDue(due: Date | null): number | null {
  if (!due) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);

  const diffTime = dueDay.getTime() - today.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Get the appropriate calendar icon based on due date
 * @param dueDate The due date to calculate icon for
 * @returns Path to the appropriate calendar SVG icon
 */
export function getDueDateIcon(dueDate: Date | null): string {
  const daysUntil = getDaysUntilDue(dueDate);

  if (daysUntil === null) {
    // No due date set
    return '/icons/calendar-add.svg';
  } else if (daysUntil < 0) {
    // Overdue
    return '/icons/calendar.badge.exclamation.svg';
  } else if (daysUntil >= 0 && daysUntil <= 31) {
    // Due within 31 days - use numbered calendar
    return `/icons/${daysUntil}.calendar.svg`;
  } else {
    // Due more than 31 days away
    return '/icons/ellipsis.calendar.svg';
  }
}

/**
 * Calculate the number of days until a start date
 * @param start The start date to calculate from
 * @returns Number of days until start (negative if already started), or null if no date
 */
export function getDaysUntilStart(start: Date | null): number | null {
  if (!start) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDay = new Date(start);
  startDay.setHours(0, 0, 0, 0);

  const diffTime = startDay.getTime() - today.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Get the appropriate calendar icon based on start date
 * @param startDate The start date to calculate icon for
 * @returns Path to the appropriate calendar SVG icon, or null if already started
 */
export function getStartDateIcon(startDate: Date | null): string | null {
  const daysUntil = getDaysUntilStart(startDate);

  if (daysUntil === null) {
    // No start date set
    return null;
  } else if (daysUntil < 0) {
    // Already started - no icon
    return null;
  } else if (daysUntil >= 0 && daysUntil <= 31) {
    // Starting within 31 days - use numbered calendar
    return `/icons/${daysUntil}.calendar.svg`;
  } else {
    // Starting more than 31 days away
    return '/icons/ellipsis.calendar.svg';
  }
}
