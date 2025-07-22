<script lang="ts">
  interface Props {
    date: Date | string;
  }

  let { date }: Props = $props();

  const dateObj = $derived(typeof date === 'string' ? new Date(date) : date);

  const formattedDate = $derived(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Reset times for comparison
    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);
    const compareDate = new Date(dateObj);
    compareDate.setHours(0, 0, 0, 0);

    if (compareDate.getTime() === today.getTime()) {
      return 'Today';
    } else if (compareDate.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else {
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  });
</script>

<div class="date-header">
  <span class="date-text">{formattedDate()}</span>
  <div class="date-line"></div>
</div>

<style>
  .date-header {
    display: flex;
    align-items: center;
    margin: 1.5rem 0 1rem;
    position: relative;
  }

  .date-text {
    background-color: var(--bg-primary);
    padding: 0 0.75rem;
    color: var(--text-secondary);
    font-size: 0.875rem;
    font-weight: 500;
    z-index: 1;
  }

  .date-line {
    position: absolute;
    left: 0;
    right: 0;
    height: 1px;
    background-color: var(--border-primary);
    top: 50%;
    transform: translateY(-50%);
  }
</style>