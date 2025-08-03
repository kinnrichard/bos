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
