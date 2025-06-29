require "test_helper"

class DeviceSerializerTest < ActiveSupport::TestCase
  setup do
    @device = devices(:john_laptop)
    @serializer = DeviceSerializer.new(@device)
    @serialization = @serializer.serializable_hash
  end

  test "serializes device with correct type" do
    assert_equal :devices, @serialization[:data][:type]
  end

  test "serializes basic attributes" do
    attributes = @serialization[:data][:attributes]

    assert_equal @device.name, attributes[:name]
    assert_equal "unknown", attributes[:deviceType]
    assert_equal @device.model, attributes[:model]
    assert_equal @device.serial_number, attributes[:serialNumber]
    assert_equal "active", attributes[:status]
  end

  test "serializes metadata" do
    attributes = @serialization[:data][:attributes]

    assert attributes.key?(:metadata)

    # Metadata should be returned as-is
    assert_equal({}, attributes[:metadata])
  end

  test "serializes computed attributes" do
    attributes = @serialization[:data][:attributes]

    assert attributes.key?(:displayName)
    assert attributes.key?(:statusLabel)
    assert attributes.key?(:isActive)
    assert attributes.key?(:requiresAttention)
  end

  test "computes display name correctly" do
    # Device with name
    serialization = DeviceSerializer.new(@device).serializable_hash
    assert_equal @device.name, serialization[:data][:attributes][:displayName]

    # Device without name should use model and type
    @device.update!(name: "temp")
    @device.update_column(:name, nil) # Skip validation
    serialization = DeviceSerializer.new(@device).serializable_hash
    expected_display_name = "#{@device.model} (unknown)"
    assert_equal expected_display_name, serialization[:data][:attributes][:displayName]
  end

  test "computes status flags correctly" do
    # All devices are active by default
    serialization = DeviceSerializer.new(@device).serializable_hash
    attributes = serialization[:data][:attributes]

    assert attributes[:isActive]
    assert_not attributes[:requiresAttention]
  end

  test "includes timestamps" do
    attributes = @serialization[:data][:attributes]

    assert attributes.key?(:createdAt)
    assert attributes.key?(:updatedAt)
    assert attributes.key?(:lastSeenAt)
  end

  test "includes relationships" do
    relationships = @serialization[:data][:relationships]

    assert relationships
    assert relationships.key?(:client)
    # notes relationship is conditional
  end

  test "transforms keys to camelCase" do
    attributes = @serialization[:data][:attributes]

    assert attributes.key?(:deviceType)
    assert attributes.key?(:serialNumber)
    assert attributes.key?(:displayName)
    assert attributes.key?(:statusLabel)
    assert attributes.key?(:isActive)
    assert attributes.key?(:requiresAttention)
    assert attributes.key?(:createdAt)
    assert attributes.key?(:lastSeenAt)

    attributes.keys.each do |key|
      assert_no_match /_/, key.to_s
    end
  end
end
