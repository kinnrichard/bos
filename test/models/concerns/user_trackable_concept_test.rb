require "test_helper"

class UserTrackableConceptTest < ActiveSupport::TestCase
  # Mock model to test the concern behavior
  class MockModel
    include ActiveModel::Model
    include ActiveModel::Validations

    attr_accessor :id, :name, :created_by_id, :updated_by_id

    # Simulate ActiveRecord column_names
    def self.column_names
      [ "id", "name", "created_by_id", "updated_by_id" ]
    end

    # Include the concern after setting up the mock
    include UserTrackable

    # Simulate new_record? for validation callbacks
    def new_record?
      id.nil?
    end

    # Simulate persisted? for validation callbacks
    def persisted?
      !new_record?
    end
  end

  setup do
    @user = users(:admin)
    @other_user = users(:owner)
    Current.user = @user
  end

  teardown do
    Current.user = nil
  end

  test "concern adds user tracking validations" do
    model = MockModel.new

    # Should have validation methods
    assert model.respond_to?(:validate_created_by, true)
    assert model.respond_to?(:validate_updated_by, true)
  end

  test "sets user attribution on new records" do
    model = MockModel.new(name: "Test")
    model.send(:set_user_attribution)

    assert_equal @user.id, model.created_by_id
    assert_equal @user.id, model.updated_by_id
  end

  test "validates created_by matches current user" do
    model = MockModel.new(name: "Test", created_by_id: @other_user.id)
    model.send(:validate_created_by)

    assert model.errors[:created_by_id].include?("must match authenticated user")
  end

  test "validates updated_by matches current user" do
    model = MockModel.new(name: "Test", updated_by_id: @other_user.id)
    model.send(:validate_updated_by)

    assert model.errors[:updated_by_id].include?("must match authenticated user")
  end

  test "requires authenticated user" do
    Current.user = nil
    model = MockModel.new(name: "Test")

    model.send(:validate_created_by)
    model.send(:validate_updated_by)

    assert model.errors[:created_by_id].include?("requires authenticated user")
    assert model.errors[:updated_by_id].include?("requires authenticated user")
  end
end
