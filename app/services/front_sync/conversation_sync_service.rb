# Conversation synchronization service for Front API
# Handles syncing conversations with tags, inbox relationships, and assignee mapping
class FrontSync::ConversationSyncService < FrontSyncService
  def sync_all(since: nil, max_results: nil)
    Rails.logger.tagged("ConversationSync") do
      sync_type = since ? "incremental" : "full"
      Rails.logger.info "Starting #{sync_type} conversation synchronization#{ since ? " since #{since}" : ""}"

      start_time = Time.current
      log_sync_start("conversations")

      # Build query parameters
      params = {}
      params[:since] = since.to_i if since
      params[:limit] = max_results if max_results

      # Process conversations in batches to avoid memory issues
      batch_count = 0
      fetch_all_data("conversations", params) do |conversation_data|
        sync_conversation(conversation_data)
        batch_count += 1

        # Log progress every 100 records
        if batch_count % 100 == 0
          Rails.logger.info "Processed #{batch_count} conversations so far..."
        end
      end

      Rails.logger.info "Processed #{batch_count} conversations total"

      duration = Time.current - start_time
      Rails.logger.info "Conversation sync completed in #{duration.round(2)}s: #{@stats[:created]} created, #{@stats[:updated]} updated, #{@stats[:failed]} failed"

      log_sync_completion("conversations", @stats, duration)
      @stats
    end
  end

  private

  # Sync individual conversation with associated relationships
  def sync_conversation(conversation_data)
    front_id = conversation_data["id"]
    return unless front_id

    conversation = upsert_record(FrontConversation, front_id, conversation_data) do |data, existing_record|
      transform_conversation_attributes(data, existing_record)
    end

    return unless conversation

    # Sync conversation relationships
    sync_conversation_tags(conversation, conversation_data["tags"] || [])
    sync_conversation_inboxes(conversation, conversation_data["inboxes"] || [])

  rescue => e
    Rails.logger.error "Failed to sync conversation #{conversation_data['id']}: #{e.message}"
    increment_failed("Conversation sync error: #{e.message}")
  end

  # Transform Front conversation attributes to FrontConversation model attributes
  def transform_conversation_attributes(conversation_data, existing_record = nil)
    # Extract assignee from Front API data
    assignee_id = find_assignee_id(conversation_data["assignee"])

    # Extract recipient contact from Front API data
    recipient_contact_id = find_recipient_contact_id(conversation_data["recipient"])

    # Base attributes
    attributes = {
      subject: conversation_data["subject"],
      status: conversation_data["status"],
      status_category: determine_status_category(conversation_data["status"]),
      status_id: conversation_data["status_id"],
      is_private: conversation_data["is_private"] || false,
      created_at_timestamp: conversation_data["created_at"],
      waiting_since_timestamp: conversation_data["waiting_since"],
      custom_fields: conversation_data["custom_fields"] || {},
      assignee_id: assignee_id,
      recipient_contact_id: recipient_contact_id,
      api_links: conversation_data["_links"] || {}
    }

    # Handle metadata - merge links, scheduled reminders, and other metadata
    metadata = {}
    metadata["links"] = conversation_data["links"] if conversation_data["links"]
    metadata["scheduled_reminders"] = conversation_data["scheduled_reminders"] if conversation_data["scheduled_reminders"]
    metadata["last_message"] = conversation_data["last_message"] if conversation_data["last_message"]

    attributes[:metadata] = metadata
    attributes[:links] = conversation_data["links"] || []
    attributes[:scheduled_reminders] = conversation_data["scheduled_reminders"] || []

    attributes
  end

  # Determine status category based on status
  def determine_status_category(status)
    case status&.downcase
    when "archived", "deleted"
      "closed"
    when "unassigned", "assigned"
      "open"
    else
      "open"
    end
  end

  # Find assignee teammate ID from Front assignee data
  def find_assignee_id(assignee_data)
    return nil unless assignee_data && assignee_data["id"]

    # Look for teammate by Front ID
    teammate = FrontTeammate.find_by(front_id: assignee_data["id"])
    teammate&.id
  end

  # Find recipient contact ID from Front recipient data
  def find_recipient_contact_id(recipient_data)
    return nil unless recipient_data && recipient_data["handle"]

    # Find contact by handle (email)
    contact = FrontContact.find_by(handle: recipient_data["handle"])
    contact&.id
  end

  # Sync conversation tags relationship
  def sync_conversation_tags(conversation, tags_data)
    return unless tags_data.any?

    # Get current tag IDs
    current_tag_ids = conversation.front_conversation_tags.pluck(:front_tag_id)

    # Process each tag from API
    new_tag_ids = []
    tags_data.each do |tag_data|
      tag = FrontTag.find_by(front_id: tag_data["id"])
      if tag
        new_tag_ids << tag.id

        # Create association if it doesn't exist
        unless current_tag_ids.include?(tag.id)
          FrontConversationTag.create!(
            front_conversation: conversation,
            front_tag: tag
          )
        end
      else
        Rails.logger.warn "Tag not found for conversation #{conversation.front_id}: #{tag_data['id']}"
      end
    end

    # Remove associations for tags no longer present
    tags_to_remove = current_tag_ids - new_tag_ids
    if tags_to_remove.any?
      conversation.front_conversation_tags.joins(:front_tag)
                  .where(front_tags: { id: tags_to_remove })
                  .destroy_all
    end

  rescue => e
    Rails.logger.error "Failed to sync tags for conversation #{conversation.front_id}: #{e.message}"
  end

  # Sync conversation inboxes relationship
  def sync_conversation_inboxes(conversation, inboxes_data)
    return unless inboxes_data.any?

    # Get current inbox IDs
    current_inbox_ids = conversation.front_conversation_inboxes.pluck(:front_inbox_id)

    # Process each inbox from API
    new_inbox_ids = []
    inboxes_data.each do |inbox_data|
      inbox = FrontInbox.find_by(front_id: inbox_data["id"])
      if inbox
        new_inbox_ids << inbox.id

        # Create association if it doesn't exist
        unless current_inbox_ids.include?(inbox.id)
          FrontConversationInbox.create!(
            front_conversation: conversation,
            front_inbox: inbox
          )
        end
      else
        Rails.logger.warn "Inbox not found for conversation #{conversation.front_id}: #{inbox_data['id']}"
      end
    end

    # Remove associations for inboxes no longer present
    inboxes_to_remove = current_inbox_ids - new_inbox_ids
    if inboxes_to_remove.any?
      conversation.front_conversation_inboxes.joins(:front_inbox)
                  .where(front_inboxes: { id: inboxes_to_remove })
                  .destroy_all
    end

  rescue => e
    Rails.logger.error "Failed to sync inboxes for conversation #{conversation.front_id}: #{e.message}"
  end
end
