require "test_helper"

class NoteSerializerTest < ActiveSupport::TestCase
  setup do
    @note = notes(:job_note)
    @serializer = NoteSerializer.new(@note)
    @serialization = @serializer.serializable_hash
  end

  test "serializes note with correct type" do
    assert_equal :notes, @serialization[:data][:type]
  end

  test "serializes basic attributes" do
    attributes = @serialization[:data][:attributes]

    assert_equal @note.content, attributes[:content]
    assert_equal @note.notable_type, attributes[:notableType]
    assert_equal @note.notable_id, attributes[:notableId]
  end

  test "serializes metadata" do
    attributes = @serialization[:data][:attributes]

    assert attributes.key?(:metadata)
    # metadata defaults to empty hash if nil
    assert_equal({}, attributes[:metadata])
  end

  test "serializes timestamps" do
    attributes = @serialization[:data][:attributes]

    assert attributes.key?(:createdAt)
    assert attributes.key?(:updatedAt)

    # Should be in ISO format
    assert_match /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, attributes[:createdAt]
  end

  test "includes relationships" do
    relationships = @serialization[:data][:relationships]

    assert relationships
    assert relationships.key?(:author)
    assert relationships.key?(:notable)
  end

  test "serializes polymorphic notable relationship" do
    # Note on a job
    job_note = notes(:job_note)
    serialization = NoteSerializer.new(job_note).serializable_hash
    notable_rel = serialization[:data][:relationships][:notable]

    assert_equal "jobs", notable_rel[:data][:type].to_s
    assert_equal job_note.notable_id.to_s, notable_rel[:data][:id]

    # Note on a task
    task_note = notes(:task_note)
    serialization = NoteSerializer.new(task_note).serializable_hash
    notable_rel = serialization[:data][:relationships][:notable]

    assert_equal "tasks", notable_rel[:data][:type].to_s
    assert_equal task_note.notable_id.to_s, notable_rel[:data][:id]
  end

  test "transforms keys to camelCase" do
    attributes = @serialization[:data][:attributes]

    assert attributes.key?(:notableType)
    assert attributes.key?(:notableId)
    assert attributes.key?(:createdAt)
    assert attributes.key?(:updatedAt)

    attributes.keys.each do |key|
      assert_no_match /_/, key.to_s
    end
  end

  test "includes nested data when requested" do
    serialization = NoteSerializer.new(@note, { include: [ :author ] }).serializable_hash

    # Should have included data
    assert serialization[:included]

    # Find the author in included data
    author = serialization[:included].find { |item| item[:type] == :users }
    assert author
    assert_equal @note.user_id.to_s, author[:id]
  end
end
