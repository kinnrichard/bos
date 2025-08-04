<!--
  ConversationsListView - Presentation component for conversation listings
  
  This component handles the presentation layer for conversation listings,
  integrating with ReactiveView and providing a consistent UI
  across all conversation listing contexts.
-->

<script lang="ts">
  import type { ReactiveQuery } from '$lib/models/base/types';
  import type { FrontConversationData } from '$lib/models/types/front-conversation-data';
  import type { Snippet } from 'svelte';
  import ReactiveView from '$lib/reactive/ReactiveView.svelte';
  import LoadingSkeleton from '$lib/components/ui/LoadingSkeleton.svelte';
  import ConversationCard from '$lib/components/conversations/ConversationCard.svelte';
  import ConversationsLayout from '$lib/components/conversations/ConversationsLayout.svelte';

  interface Props {
    /**
     * The reactive query to fetch conversations
     */
    query: ReactiveQuery<FrontConversationData[]>;

    /**
     * Optional display filter to apply to loaded conversations
     * Defaults to identity function (no filtering)
     */
    displayFilter?: (conversations: FrontConversationData[]) => FrontConversationData[];

    /**
     * Whether to show the client name in conversation cards
     * Defaults to true
     */
    showClient?: boolean;

    /**
     * Optional title for the page
     */
    title?: string;

    /**
     * Optional snippet for additional header content
     */
    headerContent?: Snippet;

    /**
     * Optional loading message
     */
    loadingMessage?: string;

    /**
     * Optional empty state message
     */
    emptyMessage?: string;

    /**
     * Optional empty state icon
     */
    emptyIcon?: string;

    /**
     * Optional no results message (when filtered results are empty)
     */
    noResultsMessage?: string;

    /**
     * Optional no results description
     */
    noResultsDescription?: string;

    /**
     * Optional no results icon
     */
    noResultsIcon?: string;

    /**
     * Loading strategy for ReactiveView
     */
    strategy?: 'progressive' | 'immediate';
  }

  let {
    query,
    displayFilter = (conversations) => conversations,
    showClient = true,
    title,
    headerContent,
    emptyMessage = 'No conversations found',
    emptyIcon = '💬',
    noResultsMessage = 'No conversations match your filters',
    noResultsDescription = 'Try adjusting your filters or search criteria.',
    noResultsIcon = '🔍',
    strategy = 'progressive',
  }: Props = $props();

  // Group conversations by status category
  function groupConversations(conversations: FrontConversationData[]) {
    const groups: Record<string, FrontConversationData[]> = {};

    conversations.forEach((conversation) => {
      const category = conversation.status_category || 'unassigned';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(conversation);
    });

    return groups;
  }

  // Get section info for display
  function getSectionInfo(category: string) {
    const titles: Record<string, string> = {
      assigned: 'Assigned',
      unassigned: 'Unassigned',
      archived: 'Archived',
      snoozed: 'Snoozed',
    };

    return {
      title: titles[category] || category.charAt(0).toUpperCase() + category.slice(1),
    };
  }

  // Get populated sections (sections that have conversations)
  function getPopulatedSections(groupedConversations: Record<string, FrontConversationData[]>) {
    return Object.entries(groupedConversations)
      .filter(([_, conversations]) => conversations.length > 0)
      .map(([category, conversations]) => ({
        section: category,
        conversations,
        info: getSectionInfo(category),
      }))
      .sort((a, b) => {
        // Sort order: unassigned, assigned, snoozed, archived
        const order = ['unassigned', 'assigned', 'snoozed', 'archived'];
        const aIndex = order.indexOf(a.section);
        const bIndex = order.indexOf(b.section);
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      });
  }
</script>

<ConversationsLayout>
  {#snippet header()}
    {#if title}
      <h1>{title}</h1>
    {/if}
    {#if headerContent}
      {@render headerContent()}
    {/if}
  {/snippet}

  <ReactiveView {query} {strategy}>
    {#snippet loading()}
      <LoadingSkeleton type="conversation-card" count={6} />
    {/snippet}

    {#snippet error({ error, refresh })}
      <div class="error-state">
        <h2>Unable to load conversations</h2>
        <p>{error.message}</p>
        <button onclick={refresh} class="retry-button">Retry</button>
      </div>
    {/snippet}

    {#snippet empty()}
      <div class="empty-state">
        <div class="empty-state-icon">{emptyIcon}</div>
        <h2>{emptyMessage}</h2>
      </div>
    {/snippet}

    {#snippet content({ data })}
      {@const filteredConversations = displayFilter(data)}
      {@const groupedConversations = groupConversations(filteredConversations)}
      {@const populatedSections = getPopulatedSections(groupedConversations)}

      {#if filteredConversations.length === 0}
        <div class="empty-state">
          <div class="empty-state-icon">{noResultsIcon}</div>
          <h2>{noResultsMessage}</h2>
          {#if noResultsDescription}
            <p>{noResultsDescription}</p>
          {/if}
        </div>
      {:else}
        <div class="conversations-list">
          {#each populatedSections as { section, conversations, info } (section)}
            <div class="conversation-section">
              <div class="section-header">
                <h3 class="section-title">{info.title}</h3>
                <span class="section-count">{conversations.length}</span>
              </div>
              <div class="section-conversations">
                {#each conversations as conversation (conversation.id)}
                  <ConversationCard {conversation} {showClient} />
                {/each}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {/snippet}
  </ReactiveView>
</ConversationsLayout>

<style>
  /* Conversations list container */
  .conversations-list {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  /* Conversation section */
  .conversation-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* Section header */
  .section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0;
  }

  .section-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary, #1d1d1f);
    margin: 0;
    flex: 1;
  }

  .section-count {
    margin-left: auto;
    background-color: var(--bg-tertiary);
    color: var(--text-secondary);
    font-weight: 600;
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 12px;
    min-width: 24px;
    text-align: center;
    display: inline-block;
  }

  /* Section conversations container */
  .section-conversations {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* Mobile responsive adjustments */
  @media (max-width: 768px) {
    .conversations-list {
      gap: 20px;
    }

    .section-header {
      padding: 0;
    }

    .section-title {
      font-size: 15px;
    }

    .section-count {
      font-size: 13px;
      padding: 1px 6px;
    }

    .section-conversations {
      gap: 10px;
    }
  }

  /* Error state */
  .error-state {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 200px;
    padding: 32px;
    text-align: center;
  }

  .error-state h2 {
    color: var(--text-primary);
    font-size: 20px;
    font-weight: 600;
    margin: 0 0 8px 0;
  }

  .error-state p {
    color: var(--text-secondary);
    font-size: 14px;
    margin: 0 0 16px 0;
  }

  .retry-button {
    padding: 8px 16px;
    background-color: var(--accent-blue);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .retry-button:hover {
    background-color: var(--accent-blue-hover, #0051d5);
  }

  /* Empty state */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    padding: 32px;
    text-align: center;
  }

  .empty-state-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.6;
  }

  .empty-state h2 {
    color: var(--text-secondary, #86868b);
    font-size: 18px;
    font-weight: 500;
    margin: 0;
  }

  .empty-state p {
    color: var(--text-tertiary, #98989d);
    font-size: 14px;
    margin: 8px 0 0 0;
  }
</style>
