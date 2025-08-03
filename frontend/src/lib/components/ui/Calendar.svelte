<script lang="ts">
  import { createCalendar, melt, type CalendarDate } from '@melt-ui/svelte';
  import { ChevronLeft, ChevronRight } from 'lucide-svelte';
  import { CalendarDate as CalDate } from '@internationalized/date';

  interface Props {
    value?: Date | null;
    onValueChange?: (date: Date | null) => void;
    placeholder?: Date;
    disabled?: boolean;
    className?: string;
  }

  let {
    value = null,
    onValueChange,
    placeholder = new Date(),
    disabled = false,
    className = '',
  }: Props = $props();

  // Convert Date to CalendarDate
  function dateToCalendarDate(date: Date | null): CalendarDate | undefined {
    if (!date) return undefined;
    return new CalDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
  }

  // Convert CalendarDate to Date
  function calendarDateToDate(calDate: CalendarDate | undefined): Date | null {
    if (!calDate) return null;
    return new Date(calDate.year, calDate.month - 1, calDate.day);
  }

  const {
    elements: { calendar, heading, grid, cell, prevButton, nextButton },
    states: { months, headingValue, weekdays, value: calendarValue },
    helpers: { isDateDisabled, isDateUnavailable },
  } = createCalendar({
    defaultValue: dateToCalendarDate(value),
    onValueChange: ({ next }) => {
      const jsDate = calendarDateToDate(next);
      onValueChange?.(jsDate);
      return next;
    },
    defaultPlaceholder: dateToCalendarDate(placeholder),
    disabled: disabled,
  });

  // Sync external value changes
  $effect(() => {
    const currentCalDate = dateToCalendarDate(value);
    if (currentCalDate && (!$calendarValue || !currentCalDate.equals($calendarValue))) {
      calendarValue.set(currentCalDate);
    } else if (!currentCalDate && $calendarValue) {
      calendarValue.set(undefined);
    }
  });

  // Check if date is today
  function isToday(date: CalendarDate): boolean {
    const today = new Date();
    return (
      date.year === today.getFullYear() &&
      date.month === today.getMonth() + 1 &&
      date.day === today.getDate()
    );
  }

  // Check if date is selected
  function isSelected(date: CalendarDate): boolean {
    return $calendarValue ? date.equals($calendarValue) : false;
  }
</script>

<div class="calendar {className}" use:melt={$calendar}>
  <header class="calendar-header">
    <button
      class="calendar-nav-button"
      use:melt={$prevButton}
      type="button"
      aria-label="Previous month"
    >
      <ChevronLeft size={16} />
    </button>

    <div class="calendar-heading" use:melt={$heading}>
      {$headingValue}
    </div>

    <button
      class="calendar-nav-button"
      use:melt={$nextButton}
      type="button"
      aria-label="Next month"
    >
      <ChevronRight size={16} />
    </button>
  </header>

  <div class="calendar-grid" use:melt={$grid}>
    <!-- Day headers -->
    <div class="calendar-weekdays">
      {#each $weekdays as day}
        <div class="calendar-weekday">{day.slice(0, 2)}</div>
      {/each}
    </div>

    <!-- Calendar days -->
    {#each $months as month}
      <div class="calendar-month">
        {#each month.weeks as weekDates}
          <div class="calendar-week">
            {#each weekDates as date}
              <div
                class="calendar-cell"
                class:outside-month={date.month !== month.value.month}
                class:disabled={$isDateDisabled(date)}
                class:unavailable={$isDateUnavailable(date)}
                class:selected={isSelected(date)}
                class:today={isToday(date)}
                use:melt={$cell(date, month.value)}
              >
                <span class="calendar-day">
                  {date.day}
                </span>
              </div>
            {/each}
          </div>
        {/each}
      </div>
    {/each}
  </div>
</div>

<style>
  .calendar {
    background: var(--bg-secondary);
    border-radius: var(--radius-lg);
    padding: 16px;
    border: 1px solid var(--border-primary);
    font-size: 14px;
    position: relative;
    pointer-events: auto;
  }

  .calendar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .calendar-nav-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
    pointer-events: auto;
    position: relative;
    z-index: 1;
  }

  .calendar-nav-button:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .calendar-heading {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 15px;
  }

  .calendar-grid {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .calendar-weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
    margin-bottom: 8px;
  }

  .calendar-weekday {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .calendar-month {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .calendar-week {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
  }

  .calendar-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 36px;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.15s ease;
    position: relative;
    pointer-events: auto;
    user-select: none;
  }

  .calendar-cell:hover:not(.disabled):not(.outside-month) {
    background: var(--bg-tertiary);
  }

  .calendar-cell.selected {
    background: var(--accent-blue);
    color: white;
  }

  .calendar-cell.today:not(.selected) {
    background: var(--accent-blue-bg);
    color: var(--accent-blue);
    font-weight: 600;
  }

  .calendar-cell.outside-month {
    color: var(--text-tertiary);
    opacity: 0.5;
  }

  .calendar-cell.disabled {
    color: var(--text-tertiary);
    cursor: not-allowed;
    opacity: 0.3;
  }

  .calendar-cell.unavailable {
    background: var(--bg-quaternary);
    color: var(--text-tertiary);
    cursor: not-allowed;
  }

  .calendar-day {
    font-size: 14px;
    line-height: 1;
  }

  /* Responsive adjustments */
  @media (max-width: 400px) {
    .calendar {
      padding: 12px;
    }

    .calendar-cell {
      height: 32px;
    }

    .calendar-weekday {
      height: 28px;
      font-size: 11px;
    }

    .calendar-day {
      font-size: 13px;
    }
  }

  /* Accessibility improvements */
  @media (prefers-reduced-motion: reduce) {
    .calendar-cell,
    .calendar-nav-button {
      transition: none;
    }
  }

  /* High contrast mode */
  @media (prefers-contrast: high) {
    .calendar {
      border-width: 2px;
    }

    .calendar-cell.selected {
      outline: 2px solid var(--text-primary);
      outline-offset: 2px;
    }
  }
</style>
