<script lang="ts">
  let {
    user,
    size = 'normal' as 'xs' | 'small' | 'normal'
  }: {
    user: {
      id: string;
      attributes: {
        name: string;
        initials: string;
        avatar_style: string;
      };
    };
    size?: 'xs' | 'small' | 'normal';
  } = $props();

  // Derived values
  const title = $derived(user?.attributes?.name || '');

  // Avatar style mapping - these match the user avatar styles in the system
  const avatarStyles = {
    red: 'var(--accent-red)',
    blue: 'var(--accent-blue)', 
    green: 'var(--accent-green)',
    orange: 'var(--accent-orange)',
    purple: 'var(--accent-purple)',
    gray: 'var(--text-secondary)'
  };

  const backgroundColor = $derived(avatarStyles[user?.attributes?.avatar_style as keyof typeof avatarStyles] || avatarStyles.blue);
  const sizeClass = $derived(size === 'xs' ? 'avatar-xs' : size === 'small' ? 'avatar-small' : 'avatar-normal');
</script>

<div 
  class="user-avatar {sizeClass}"
  style="background-color: {backgroundColor};"
  {title}
>
  <span class="user-initials">{user?.attributes?.initials || '?'}</span>
</div>

<style>
  .user-avatar {
    border-radius: 50%;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.15s ease;
    flex-shrink: 0;
    position: relative;
  }

  .avatar-normal {
    width: 36px;
    height: 36px;
  }

  .avatar-small {
    width: 24px;
    height: 24px;
  }

  .avatar-xs {
    width: 19px;
    height: 19px;
  }

  .user-initials {
    color: white;
    font-weight: 600;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    text-transform: uppercase;
  }

  .avatar-normal .user-initials {
    font-size: 13px;
  }

  .avatar-small .user-initials {
    font-size: 10px;
  }

  .avatar-xs .user-initials {
    font-size: 12px;
  }

  /* Hover effect for interactive contexts */
  .user-avatar:hover {
    opacity: 0.9;
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .user-avatar {
      border: 2px solid var(--border-primary);
    }
  }
</style>