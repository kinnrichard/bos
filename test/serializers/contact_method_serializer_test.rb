require "test_helper"

class ContactMethodSerializerTest < ActiveSupport::TestCase
  setup do
    @contact_method = contact_methods(:john_phone)
    @serializer = ContactMethodSerializer.new(@contact_method)
    @serialization = @serializer.serializable_hash
  end

  test "serializes contact method with correct type" do
    assert_equal :contactMethods, @serialization[:data][:type]
  end

  test "serializes basic attributes" do
    attributes = @serialization[:data][:attributes]

    assert_equal @contact_method.contact_type, attributes[:contactType]
    assert_equal @contact_method.value, attributes[:value]
    assert_equal @contact_method.formatted_value, attributes[:formattedValue]
    assert_equal false, attributes[:isPrimary]
    assert_equal true, attributes[:isVerified]
  end

  test "serializes metadata" do
    attributes = @serialization[:data][:attributes]

    assert attributes.key?(:metadata)
    assert_equal({}, attributes[:metadata])
  end

  test "serializes computed attributes" do
    attributes = @serialization[:data][:attributes]

    assert attributes.key?(:displayValue)
    assert attributes.key?(:typeLabel)
    assert attributes.key?(:canReceiveSms)
  end

  test "computes display value correctly" do
    # Phone number
    phone = contact_methods(:john_phone)
    serialization = ContactMethodSerializer.new(phone).serializable_hash
    assert_equal phone.formatted_value, serialization[:data][:attributes][:displayValue]

    # Email
    email = contact_methods(:john_email)
    serialization = ContactMethodSerializer.new(email).serializable_hash
    assert_equal email.value, serialization[:data][:attributes][:displayValue]
  end

  test "computes SMS capability correctly" do
    # Phone can receive SMS
    phone = contact_methods(:john_phone)
    serialization = ContactMethodSerializer.new(phone).serializable_hash
    assert serialization[:data][:attributes][:canReceiveSms]

    # Email cannot receive SMS
    email = contact_methods(:john_email)
    serialization = ContactMethodSerializer.new(email).serializable_hash
    assert_not serialization[:data][:attributes][:canReceiveSms]
  end

  test "serializes timestamps" do
    attributes = @serialization[:data][:attributes]

    assert attributes.key?(:createdAt)
    assert attributes.key?(:updatedAt)
    assert attributes.key?(:verifiedAt)
  end

  test "includes relationships" do
    relationships = @serialization[:data][:relationships]

    assert relationships.key?(:contactable)
  end

  test "serializes polymorphic contactable relationship" do
    # Contact method for a person
    person_contact = contact_methods(:john_phone)
    serialization = ContactMethodSerializer.new(person_contact).serializable_hash
    contactable_rel = serialization[:data][:relationships][:contactable]

    assert_equal :users, contactable_rel[:data][:type]
    assert_equal person_contact.person_id.to_s, contactable_rel[:data][:id]
  end

  test "transforms keys to camelCase" do
    attributes = @serialization[:data][:attributes]

    assert attributes.key?(:methodType)
    assert attributes.key?(:isPrimary)
    assert attributes.key?(:isVerified)
    assert attributes.key?(:displayValue)
    assert attributes.key?(:typeLabel)
    assert attributes.key?(:canReceiveSms)
    assert attributes.key?(:createdAt)
    assert attributes.key?(:verifiedAt)

    attributes.keys.each do |key|
      assert_no_match /_/, key.to_s
    end
  end
end
