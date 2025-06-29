require "test_helper"

class PersonSerializerTest < ActiveSupport::TestCase
  setup do
    @user = users(:technician)
    @serializer = PersonSerializer.new(@user)
    @serialization = @serializer.serializable_hash
  end

  test "serializes user with correct type" do
    assert_equal :users, @serialization[:data][:type]
  end

  test "serializes basic attributes" do
    attributes = @serialization[:data][:attributes]

    assert_equal @user.name, attributes[:name]
    assert_equal @user.email, attributes[:email]
    assert_equal @user.role, attributes[:role]
    assert_equal "active", attributes[:status]
  end

  test "serializes full name components" do
    attributes = @serialization[:data][:attributes]

    assert attributes.key?(:firstName)
    assert attributes.key?(:lastName)
    assert attributes.key?(:fullName)

    assert_equal @user.first_name, attributes[:firstName]
    assert attributes[:lastName] # Computed from name
    assert_equal @user.name, attributes[:fullName]
  end

  test "serializes computed attributes" do
    attributes = @serialization[:data][:attributes]

    assert attributes.key?(:isActive)
    assert attributes.key?(:isTechnician)
    assert attributes.key?(:isAdmin)
    assert attributes.key?(:canManageJobs)
  end

  test "computes role flags correctly" do
    # Test technician
    technician = users(:technician)
    serialization = PersonSerializer.new(technician).serializable_hash
    attributes = serialization[:data][:attributes]

    assert attributes[:isTechnician]
    assert_not attributes[:isAdmin]

    # Test admin
    admin = users(:admin)
    serialization = PersonSerializer.new(admin).serializable_hash
    attributes = serialization[:data][:attributes]

    assert_not attributes[:isTechnician]
    assert attributes[:isAdmin]
  end

  test "computes permissions correctly" do
    # Test technician permissions
    technician = users(:technician)
    serialization = PersonSerializer.new(technician).serializable_hash

    assert serialization[:data][:attributes][:canManageJobs]

    # Test owner permissions
    owner = users(:owner)
    serialization = PersonSerializer.new(owner).serializable_hash

    assert serialization[:data][:attributes][:canManageJobs]
  end

  test "includes timestamps" do
    attributes = @serialization[:data][:attributes]

    assert attributes.key?(:createdAt)
    assert attributes.key?(:updatedAt)
    assert attributes.key?(:lastSeenAt)
  end

  test "includes relationships" do
    relationships = @serialization[:data][:relationships]

    assert relationships.key?(:assignedTasks)
    assert relationships.key?(:createdJobs)
    assert relationships.key?(:technicianJobs)
    assert relationships.key?(:notes)
  end

  test "transforms keys to camelCase" do
    attributes = @serialization[:data][:attributes]

    assert attributes.key?(:firstName)
    assert attributes.key?(:lastName)
    assert attributes.key?(:fullName)
    assert attributes.key?(:isActive)
    assert attributes.key?(:isTechnician)
    assert attributes.key?(:canManageJobs)
    assert attributes.key?(:createdAt)
    assert attributes.key?(:lastSeenAt)

    attributes.keys.each do |key|
      assert_no_match /_/, key.to_s
    end
  end
end
