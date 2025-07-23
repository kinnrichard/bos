require "test_helper"

class ClientSerializerTest < ActiveSupport::TestCase
  setup do
    @client = clients(:acme)
    @serializer = ClientSerializer.new(@client)
    @serialization = @serializer.serializable_hash
  end

  test "serializes client with correct type" do
    assert_equal :clients, @serialization[:data][:type]
  end

  test "serializes basic attributes" do
    attributes = @serialization[:data][:attributes]

    assert_equal @client.name, attributes[:name]
    assert_nil attributes[:nickname]
    assert_nil attributes[:primaryContactName]
    assert_nil attributes[:primaryContactPhone]
    assert_nil attributes[:primaryContactEmail]
  end

  test "serializes phone metadata" do
    attributes = @serialization[:data][:attributes]

    assert attributes.key?(:phoneMetadata)
    metadata = attributes[:phoneMetadata]

    assert metadata.key?(:type)
    assert metadata.key?(:carrier)
    assert metadata.key?(:location)
  end

  test "serializes computed attributes" do
    attributes = @serialization[:data][:attributes]

    assert attributes.key?(:jobsCount)
    assert attributes.key?(:recentJobsCount)
    assert attributes.key?(:activeJobsCount)
    assert attributes.key?(:isActive)
  end

  test "computes job counts correctly" do
    # Use a fresh client to avoid conflicts
    client = Client.create!(name: "Test Client", client_type: "residential")

    # Create some jobs for the client
    3.times { client.jobs.create!(title: "Test job", status: "open") }
    2.times { client.jobs.create!(title: "Old job", status: "successfully_completed", created_at: 40.days.ago) }

    serialization = ClientSerializer.new(client).serializable_hash
    attributes = serialization[:data][:attributes]

    assert_equal 5, attributes[:jobsCount]
    assert_equal 3, attributes[:recentJobsCount]
    assert_equal 3, attributes[:activeJobsCount]
  end

  test "computes active status correctly" do
    # Client with recent job should be active
    @client.jobs.create!(title: "Recent job", created_at: 5.days.ago)

    serialization = ClientSerializer.new(@client).serializable_hash
    assert serialization[:data][:attributes][:isActive]

    # Client with only old jobs should not be active
    @client.jobs.update_all(created_at: 100.days.ago)

    serialization = ClientSerializer.new(@client).serializable_hash
    assert_not serialization[:data][:attributes][:isActive]
  end

  test "includes relationships" do
    relationships = @serialization[:data][:relationships]

    assert relationships.key?(:jobs)
    assert relationships.key?(:devices)
    # notes and contactMethods are conditional/not present
  end

  test "transforms keys to camelCase" do
    attributes = @serialization[:data][:attributes]

    assert attributes.key?(:primaryContactName)
    assert attributes.key?(:phoneMetadata)
    assert attributes.key?(:jobsCount)
    assert attributes.key?(:activeJobsCount)

    attributes.keys.each do |key|
      assert_no_match /_/, key.to_s
    end
  end
end
