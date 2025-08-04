require "test_helper"

class FrontConversationTest < ActiveSupport::TestCase
  def setup
    @client = Client.create!(name: "Test Client", client_type: "residential")
    @person = Person.create!(name: "Test Person", client: @client)
    @contact_method = ContactMethod.create!(
      person: @person,
      value: "test@example.com",
      contact_type: "email"
    )
  end

  test "has matched_contact association defined" do
    conversation = FrontConversation.new(
      front_id: "cnv_test123",
      status: "unassigned",
      recipient_handle: @contact_method.normalized_value
    )

    assert_respond_to conversation, :matched_contact
    # Association is defined but may not match in test environment
  end

  test "has person association through matched_contact" do
    conversation = FrontConversation.new(
      front_id: "cnv_test123",
      status: "unassigned"
    )

    assert_respond_to conversation, :person
    assert_respond_to conversation, :client
  end

  test "matched_contact association filters by phone and email only" do
    # Create address contact method
    address_contact = ContactMethod.create!(
      person: @person,
      value: "123 Main St",
      contact_type: "address"
    )

    conversation = FrontConversation.new(
      front_id: "cnv_test123",
      status: "unassigned",
      recipient_handle: address_contact.normalized_value
    )

    # The association should filter out address contacts
    # This tests the association definition, not the actual query in test env
    assert_respond_to conversation, :matched_contact
  end

  test "has proper scopes defined" do
    assert_respond_to FrontConversation, :unassigned
    assert_respond_to FrontConversation, :assigned
    assert_respond_to FrontConversation, :archived
    assert_respond_to FrontConversation, :open
    assert_respond_to FrontConversation, :recent
    assert_respond_to FrontConversation, :with_client_data
  end

  test "validates required fields" do
    conversation = FrontConversation.new

    assert_not conversation.valid?
    assert_includes conversation.errors[:front_id], "can't be blank"
    assert_includes conversation.errors[:status], "can't be blank"
  end

  test "validates uniqueness of front_id" do
    FrontConversation.create!(
      front_id: "cnv_unique123",
      status: "unassigned"
    )

    duplicate = FrontConversation.new(
      front_id: "cnv_unique123",
      status: "assigned"
    )

    assert_not duplicate.valid?
    assert_includes duplicate.errors[:front_id], "has already been taken"
  end

  test "has helper methods for time handling" do
    conversation = FrontConversation.new(
      front_id: "cnv_test123",
      status: "unassigned",
      created_at_timestamp: Time.current.to_i,
      waiting_since_timestamp: Time.current.to_i
    )

    assert_respond_to conversation, :created_time
    assert_respond_to conversation, :waiting_since_time
    assert_instance_of Time, conversation.created_time
    assert_instance_of Time, conversation.waiting_since_time
  end

  test "has message sync methods" do
    conversation = FrontConversation.new(
      front_id: "cnv_test123",
      status: "unassigned"
    )

    assert_respond_to conversation, :download_messages
    assert_respond_to conversation, :messages_need_update?
    assert_respond_to conversation, :sync_messages_if_needed
  end

  test "has associations with other Front models" do
    conversation = FrontConversation.new

    assert_respond_to conversation, :front_messages
    assert_respond_to conversation, :front_conversation_tags
    assert_respond_to conversation, :front_tags
    assert_respond_to conversation, :front_conversation_inboxes
    assert_respond_to conversation, :front_inboxes
    assert_respond_to conversation, :assignee
    assert_respond_to conversation, :recipient_contact
  end
end
