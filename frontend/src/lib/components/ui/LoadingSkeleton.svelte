<script lang="ts">
  export let count: number = 5;
  export let type: 'job-card' | 'generic' = 'generic';
</script>

{#if type === 'job-card'}
  <!-- Job card skeleton that matches JobCard layout -->
  {#each Array(count) as _, i}
    <div class="skeleton-job-card" data-testid="job-card-skeleton">
      <!-- Status emoji skeleton -->
      <div class="skeleton-emoji"></div>
      
      <!-- Job name section skeleton -->
      <div class="skeleton-job-content">
        <div class="skeleton-client-name"></div>
        <div class="skeleton-job-title"></div>
      </div>
      
      <!-- Right section skeleton -->
      <div class="skeleton-right-section">
        <!-- Priority emoji skeleton (randomly show/hide) -->
        {#if i % 3 === 0}
          <div class="skeleton-priority-emoji"></div>
        {/if}
        
        <!-- Technician avatars skeleton (random 1-3 avatars) -->
        <div class="skeleton-technician-avatars">
          {#each Array(Math.min(3, Math.max(1, (i % 3) + 1))) as _}
            <div class="skeleton-avatar"></div>
          {/each}
        </div>
      </div>
    </div>
  {/each}
{:else}
  <!-- Generic skeleton -->
  {#each Array(count) as _}
    <div class="skeleton-generic">
      <div class="skeleton-line skeleton-line--title"></div>
      <div class="skeleton-line skeleton-line--subtitle"></div>
    </div>
  {/each}
{/if}

<style>
  .skeleton-job-card {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    margin-bottom: 8px;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 8px;
    animation: skeleton-pulse 1.5s ease-in-out infinite;
  }

  .skeleton-emoji {
    width: 16px;
    height: 16px;
    margin-right: 12px;
    background-color: var(--bg-tertiary);
    border-radius: 4px;
    flex-shrink: 0;
  }

  .skeleton-job-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .skeleton-client-name {
    width: 60%;
    height: 12px;
    background-color: var(--bg-tertiary);
    border-radius: 4px;
  }

  .skeleton-job-title {
    width: 80%;
    height: 14px;
    background-color: var(--bg-tertiary);
    border-radius: 4px;
  }

  .skeleton-right-section {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .skeleton-priority-emoji {
    width: 14px;
    height: 14px;
    background-color: var(--bg-tertiary);
    border-radius: 4px;
  }

  .skeleton-technician-avatars {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .skeleton-avatar {
    width: 24px;
    height: 24px;
    background-color: var(--bg-tertiary);
    border-radius: 50%;
    flex-shrink: 0;
  }

  .skeleton-generic {
    padding: 16px;
    margin-bottom: 8px;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 8px;
    animation: skeleton-pulse 1.5s ease-in-out infinite;
  }

  .skeleton-line {
    height: 16px;
    background-color: var(--bg-tertiary);
    border-radius: 4px;
    margin-bottom: 8px;
  }

  .skeleton-line--title {
    width: 75%;
  }

  .skeleton-line--subtitle {
    width: 50%;
    margin-bottom: 0;
  }

  @keyframes skeleton-pulse {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0.6;
    }
    100% {
      opacity: 1;
    }
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .skeleton-job-card {
      padding: 10px 12px;
    }
    
    .skeleton-client-name {
      height: 11px;
    }
    
    .skeleton-job-title {
      height: 13px;
    }
  }

  /* Accessibility */
  @media (prefers-reduced-motion: reduce) {
    .skeleton-job-card,
    .skeleton-generic {
      animation: none;
    }
  }
</style>