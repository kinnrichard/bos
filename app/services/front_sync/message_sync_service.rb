# Message synchronization service for Front API
# Handles syncing messages for conversations with recipients and attachment metadata
class FrontSync::MessageSyncService < FrontSyncService
  def sync_all(since: nil, max_results: nil)
    Rails.logger.tagged("MessageSync") do
      sync_type = since ? "incremental" : "full"
      Rails.logger.info "Starting #{sync_type} message synchronization#{ since ? " since #{since}" : ""}"

      start_time = Time.current
      log_sync_start("messages")

      # Build query parameters
      params = {}
      params[:since] = since.to_i if since
      params[:limit] = max_results if max_results

      # Process messages in batches to avoid memory issues
      batch_count = 0
      fetch_all_data("messages", params) do |message_data|
        sync_message(message_data)
        batch_count += 1

        # Log progress every 100 records
        if batch_count % 100 == 0
          Rails.logger.info "Processed #{batch_count} messages so far..."
        end
      end

      Rails.logger.info "Processed #{batch_count} messages total"

      duration = Time.current - start_time
      Rails.logger.info "Message sync completed in #{duration.round(2)}s: #{@stats[:created]} created, #{@stats[:updated]} updated, #{@stats[:failed]} failed"

      log_sync_completion("messages", @stats, duration)
      @stats
    end
  end

  # Sync messages for specific conversations
  def sync_for_conversations(conversation_ids)
    Rails.logger.tagged("MessageSync") do
      Rails.logger.info "Starting message sync for #{conversation_ids.size} conversations"

      start_time = Time.current
      log_sync_start("messages")

      conversation_ids.each do |conversation_id|
        sync_messages_for_conversation(conversation_id)
      end

      duration = Time.current - start_time
      Rails.logger.info "Message sync for conversations completed in #{duration.round(2)}s: #{@stats[:created]} created, #{@stats[:updated]} updated, #{@stats[:failed]} failed"

      log_sync_completion("messages", @stats, duration)
      @stats
    end
  end

  private

  # Sync messages for a specific conversation
  def sync_messages_for_conversation(conversation_id)
    begin
      # Find the conversation in our database
      conversation = FrontConversation.find_by(front_id: conversation_id)
      unless conversation
        Rails.logger.warn "Conversation not found: #{conversation_id}"
        return
      end

      # Fetch messages for this conversation from Front API
      Rails.logger.debug "Fetching messages for conversation #{conversation_id}"

      # Use the client to fetch conversation messages
      messages_data = client.get_conversation_messages(conversation_id)

      Rails.logger.debug "Fetched #{messages_data.size} messages for conversation #{conversation_id}"

      # Sync each message
      messages_data.each do |message_data|
        sync_message(message_data, conversation)
      end

    rescue => e
      Rails.logger.error "Failed to sync messages for conversation #{conversation_id}: #{e.message}"
      increment_failed("Conversation messages sync error: #{e.message}")
    end
  end

  # Sync individual message with associated relationships
  def sync_message(message_data, conversation = nil)
    # Find conversation if not provided
    unless conversation
      conversation_id = message_data.dig("conversation", "id")
      if conversation_id
        conversation = FrontConversation.find_by(front_id: conversation_id)
      end

      unless conversation
        Rails.logger.warn "Conversation not found for message #{message_data['id']}"
        increment_failed("Message sync error: Conversation not found")
        return
      end
    end

    front_id = message_data["id"]
    return unless front_id

    message = upsert_record(FrontMessage, front_id, message_data) do |data, existing_record|
      transform_message_attributes(data, conversation, existing_record)
    end

    return unless message

    # Sync message relationships
    sync_message_recipients(message, message_data["recipients"] || [])
    sync_message_attachments(message, message_data["attachments"] || [])

  rescue => e
    Rails.logger.error "Failed to sync message #{message_data['id']}: #{e.message}"
    increment_failed("Message sync error: #{e.message}")
  end

  # Transform Front message attributes to FrontMessage model attributes
  def transform_message_attributes(message_data, conversation, existing_record = nil)
    # Extract author from Front API data
    author_id = find_author_id(message_data["author"])

    # Base attributes
    attributes = {
      front_conversation_id: conversation.id,
      message_uid: message_data["message_uid"],
      message_type: message_data["type"],
      is_inbound: message_data["is_inbound"] || false,
      is_draft: message_data["is_draft"] || false,
      subject: message_data["subject"],
      blurb: message_data["blurb"],
      body_html: message_data["body"],
      body_plain: message_data["text"],
      error_type: message_data["error_type"],
      draft_mode: message_data["draft_mode"],
      created_at_timestamp: message_data["created_at"],
      author_id: author_id,
      api_links: message_data["_links"] || {}
    }

    # Handle metadata - store additional message information
    metadata = {}
    metadata["version"] = message_data["version"] if message_data["version"]
    metadata["thread_ref"] = message_data["thread_ref"] if message_data["thread_ref"]
    metadata["is_system"] = message_data["is_system"] if message_data.key?("is_system")
    metadata["delivery_status"] = message_data["delivery_status"] if message_data["delivery_status"]

    attributes[:metadata] = metadata

    attributes
  end

  # Find author contact ID from Front author data
  def find_author_id(author_data)
    return nil unless author_data

    # Author can be a contact or a teammate
    if author_data["_links"] && author_data["_links"]["self"]
      # If it's a contact, find by Front contact ID
      if author_data["_links"]["self"].include?("contacts/")
        contact = FrontContact.find_by(front_id: author_data["id"])
        return contact&.id
      end

      # If it's a teammate, we might not have them in our FrontContact table
      # For now, we'll skip teammate authors, but this could be extended
      # to create FrontContact records for teammates if needed
    end

    nil
  end

  # Sync message recipients relationship
  def sync_message_recipients(message, recipients_data)
    return unless recipients_data.any?

    # Clear existing recipients to rebuild them
    message.front_message_recipients.destroy_all

    recipients_data.each do |recipient_data|
      sync_message_recipient(message, recipient_data)
    end

  rescue => e
    Rails.logger.error "Failed to sync recipients for message #{message.front_id}: #{e.message}"
  end

  # Sync individual message recipient
  def sync_message_recipient(message, recipient_data)
    # Find the contact
    contact = find_contact_by_handle(recipient_data["handle"])

    unless contact
      Rails.logger.warn "Contact not found for recipient #{recipient_data['handle']} in message #{message.front_id}"
      return
    end

    # Create or update the recipient relationship
    # Include handle and name from the recipient data
    FrontMessageRecipient.find_or_create_by(
      front_message: message,
      front_contact: contact,
      role: recipient_data["role"] || "to"
    ) do |recipient|
      recipient.handle = recipient_data["handle"]
      recipient.name = recipient_data["name"]
    end

  rescue => e
    Rails.logger.error "Failed to create recipient for message #{message.front_id}: #{e.message}"
  end

  # Find contact by handle (email address)
  def find_contact_by_handle(handle)
    return nil unless handle

    # First try direct handle match
    contact = FrontContact.find_by(handle: handle)
    return contact if contact

    # Then try searching in handles JSONB array
    FrontContact.where("handles @> ?", [ { source: "email", handle: handle } ].to_json).first
  end

  # Sync message attachments metadata (not file content)
  def sync_message_attachments(message, attachments_data)
    return unless attachments_data.any?

    # Clear existing attachments to rebuild them
    message.front_attachments.destroy_all

    attachments_data.each do |attachment_data|
      sync_message_attachment(message, attachment_data)
    end

  rescue => e
    Rails.logger.error "Failed to sync attachments for message #{message.front_id}: #{e.message}"
  end

  # Sync individual message attachment metadata
  def sync_message_attachment(message, attachment_data)
    FrontAttachment.create!(
      front_message: message,
      front_id: attachment_data["id"],
      filename: attachment_data["filename"],
      url: attachment_data["url"],
      content_type: attachment_data["content_type"],
      size: attachment_data["size"],
      metadata: {
        is_inline: attachment_data["is_inline"],
        content_id: attachment_data["content_id"],
        disposition: attachment_data["disposition"]
      }.compact
    )

  rescue => e
    Rails.logger.error "Failed to create attachment for message #{message.front_id}: #{e.message}"
  end
end
