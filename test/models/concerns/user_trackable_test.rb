require "test_helper"

class UserTrackableTest < ActiveSupport::TestCase
  # Create a test model that includes UserTrackable
  class TestModel < ApplicationRecord
    self.table_name = "clients" # Use existing table for testing
    include UserTrackable
  end

  setup do
    @user = users(:admin)
    @other_user = users(:owner)
    Current.user = @user
  end

  teardown do
    Current.user = nil
  end

  test "sets created_by and updated_by on create" do
    model = TestModel.new(name: "Test")

    assert model.valid?
    assert_equal @user.id, model.created_by_id
    assert_equal @user.id, model.updated_by_id
  end

  test "validates created_by matches current user on create" do
    model = TestModel.new(name: "Test", created_by_id: @other_user.id)

    assert_not model.valid?
    assert_includes model.errors[:created_by_id], "must match authenticated user"
  end

  test "validates updated_by matches current user on create" do
    model = TestModel.new(name: "Test", updated_by_id: @other_user.id)

    assert_not model.valid?
    assert_includes model.errors[:updated_by_id], "must match authenticated user"
  end

  test "requires authenticated user for create" do
    Current.user = nil
    model = TestModel.new(name: "Test")

    assert_not model.valid?
    assert_includes model.errors[:created_by_id], "requires authenticated user"
    assert_includes model.errors[:updated_by_id], "requires authenticated user"
  end

  test "updates only updated_by on update" do
    # Create with first user
    Current.user = @user
    model = TestModel.create!(name: "Test")
    original_created_by = model.created_by_id

    # Update with different user
    Current.user = @other_user
    model.name = "Updated"
    model.save!

    assert_equal original_created_by, model.created_by_id
    assert_equal @other_user.id, model.updated_by_id
  end

  test "prevents falsifying updated_by on update" do
    model = TestModel.create!(name: "Test")

    # Try to update with wrong user
    model.name = "Updated"
    model.updated_by_id = @other_user.id

    assert_not model.valid?
    assert_includes model.errors[:updated_by_id], "must match authenticated user"
  end

  test "allows nil created_by if Current.user is set" do
    model = TestModel.new(name: "Test", created_by_id: nil)

    assert model.valid?
    assert_equal @user.id, model.created_by_id
  end

  test "allows nil updated_by if Current.user is set" do
    model = TestModel.new(name: "Test", updated_by_id: nil)

    assert model.valid?
    assert_equal @user.id, model.updated_by_id
  end
end
