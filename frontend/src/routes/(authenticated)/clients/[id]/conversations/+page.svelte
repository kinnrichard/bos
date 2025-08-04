<!--
  Client Conversations Page - Client-specific conversations listing
  
  This page shows conversations for a specific client, filtered to exclude closed ones.
  Uses ConversationsListView with ReactiveQuery for live updates.
-->

<script lang="ts">
  import { page } from '$app/stores';
  import ConversationsListView from '$lib/components/conversations/ConversationsListView.svelte';
  import { ReactiveFrontConversation } from '$lib/models/reactive-front-conversation';
  import { ReactiveClient } from '$lib/models/reactive-client';
  import type { FrontConversationData } from '$lib/models/types/front-conversation-data';

  // Get client ID from route params
  const clientId = $derived($page.params.id);

  // Create reactive query for client data
  const clientQuery = $derived(ReactiveClient.find(clientId));

  // Create reactive query for client conversations, filtering out closed ones
  // Note: This assumes conversations have a client relationship or client_id field
  // You may need to adjust this based on your actual data model
  const conversationsQuery = $derived(
    ReactiveFrontConversation.where({
      status_category: 'open',
      // TODO: Add client_id: clientId when relationship is available
    })
      .orderBy('waiting_since_timestamp', 'desc')
      .all()
  );

  // Filter function to ensure only open conversations
  // and filter by client if needed at the display level
  function filterClientConversations(
    conversations: FrontConversationData[]
  ): FrontConversationData[] {
    return conversations.filter((conv) => {
      // Ensure only open conversations (should be redundant with query)
      if (conv.status_category !== 'open') return false;

      // TODO: Add client-specific filtering here once the relationship is established
      // This might involve checking conv.client_id === clientId or similar

      return true;
    });
  }

  // Get client name for title
  const clientName = $derived($clientQuery.data?.name || 'Unknown Client');
  const pageTitle = $derived(`${clientName} - Conversations`);
</script>

<svelte:head>
  <title>{pageTitle} - FAULTLESS</title>
</svelte:head>

<ConversationsListView
  query={conversationsQuery}
  displayFilter={filterClientConversations}
  title="{clientName} Conversations"
  showClient={false}
  emptyMessage="No conversations found for this client"
  emptyIcon="💬"
  noResultsMessage="No conversations match your criteria"
  noResultsDescription="This client may not have any open conversations."
  noResultsIcon="🔍"
  strategy="progressive"
/>
